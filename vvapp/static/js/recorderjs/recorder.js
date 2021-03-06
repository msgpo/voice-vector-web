/*License (MIT)

 Copyright © 2013 Matt Diamond

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 DEALINGS IN THE SOFTWARE.
 */

(function (window) {

    var WORKER_PATH = '/static/js/recorderjs/recorderWorker.js';

    var Recorder = function (source, cfg) {
        var config = cfg || {};
        var bufferLen = config.bufferLen || 4096;
        this.context = source.context;
        if (!this.context.createScriptProcessor) {
            this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
        } else {
            this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
        }

        var worker = new Worker(config.workerPath || WORKER_PATH);
        worker.postMessage({
            command: 'init',
            config: {
                sampleRate: this.context.sampleRate
            }
        });
        var recording = false,
            currCallback;

        this.node.onaudioprocess = function (e) {
            if (!recording) return;
            worker.postMessage({
                command: 'record',
                buffer: [
                    e.inputBuffer.getChannelData(0),
                    e.inputBuffer.getChannelData(1)
                ]
            });
        }

        this.configure = function (cfg) {
            for (var prop in cfg) {
                if (cfg.hasOwnProperty(prop)) {
                    config[prop] = cfg[prop];
                }
            }
        }

        this.record = function () {
            recording = true;
        }

        this.stop = function () {
            recording = false;
        }

        this.clear = function () {
            worker.postMessage({command: 'clear'});
        }

        this.getBuffers = function (cb) {
            currCallback = cb || config.callback;
            worker.postMessage({command: 'getBuffers'})
        }

        this.exportWAV = function (cb, type) {
            currCallback = cb || config.callback;
            type = type || config.type || 'audio/wav';
            if (!currCallback) throw new Error('Callback not set');
            worker.postMessage({
                command: 'exportWAV',
                type: type
            });
        }

        this.exportMonoWAV = function (cb, type) {
            currCallback = cb || config.callback;
            type = type || config.type || 'audio/wav';
            if (!currCallback) throw new Error('Callback not set');
            worker.postMessage({
                command: 'exportMonoWAV',
                type: type
            });
        }

        worker.onmessage = function (e) {
            var blob = e.data;
            currCallback(blob);
        }

        source.connect(this.node);
        this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
    };

    Recorder.setupDownload = function (blob, filename) {
        var fd = new FormData();
        //fd.append('fname', 'user_audio.wav');
        fd.append('user_wav', blob, 'user_audio.wav');

        var element = document.getElementById("div_record");
        element.classList.add("div_hidden");

        var element = document.getElementById("div_process");
        element.classList.remove("div_hidden");

        $.ajax({
            type: 'POST',
            url: '/api',
            data: fd,
            processData: false,
            contentType: false
        }).done(function (data) {
            //parsed = JSON.parse(data)
            //document.getElementById("div_result").innerHTML = data.full_name;

            document.getElementById("result_img").src = "/static/img/celeb_face/" + data.full_name + "." + data.picture;
            document.getElementById("result_percent").innerText = parseInt(data.percent * 100);
            document.getElementById("result_name").innerText = data.full_name.replace("_"," ");
            document.getElementById("result_sex").innerText = data.sex;
            document.getElementById("result_age").innerText = data.age;
            document.getElementById("result_nationality").innerText = data.nationality;
            document.getElementById("result_job").innerText = data.Job;
            result_height = document.getElementById("result_height");
            if(data.Height) {
                result_height.innerText = data.Height;
            } else {
                result_height.parentNode.classList.add("div_hidden");
            }

            //youtube video embedded.
            //html = '';

            if(data.yt_params.length > 2){
                yt_cnt = 2;
            }
            else{
                yt_cnt = data.yt_params.length;
            }
            for (i = 0; i < yt_cnt; i++) {
                params = data.yt_params[i];
                vid = params[0];
                s_time = params[1];
                html = '​<iframe src="https://www.youtube.com/embed/' + vid + '?start=' + s_time + '" frameborder="0" allow="autoplay;" allowfullscreen></iframe>'
                
                document.getElementById("result_yt_"+(i+1)).innerHTML = html;
            }

            var element = document.getElementById("div_process");
            element.classList.add("div_hidden");

            var element = document.getElementById("div_result");
            element.classList.remove("div_hidden");

        });
        //var url = (window.URL || window.webkitURL).createObjectURL(blob);
        //var link = document.getElementById("save");
        //link.href = url;
        //link.download = filename || 'output.wav';
    };

    window.Recorder = Recorder;

})(window);
