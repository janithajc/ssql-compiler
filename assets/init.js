var Compiler = {
	compileBtn : $("#compile"),
	source: null,
	params: null,
	functions: null,
	output: null,
	fileName: "sqlCompilerState.json",
	init: function(){
		var options = {
	        enableBasicAutocompletion: true,
	        enableSnippets: true,
	        enableLiveAutocompletion: false,
	        setAutoScrollEditorIntoView: true,
	        maxLines: 30,
	        minLines: 10
	    };
	    $('.tooltipped').tooltip({delay: 50});
    	$('.button-collapse').sideNav();
    	$('.minmax-btn').on('click', Compiler.UI.maximizeMinimize);
    	$('#load').on('change', Compiler.loadFromFile);
		Compiler.compileBtn.on("click", Compiler.compileAndShow);

		Compiler.source = ace.edit("source");
	    Compiler.source.setTheme("ace/theme/chrome");
	    Compiler.source.session.setMode("ace/mode/ssql");
	    Compiler.source.setOptions(options);

		Compiler.params = ace.edit("params");
	    Compiler.params.setTheme("ace/theme/chrome");
	    Compiler.params.session.setMode("ace/mode/sql");
	    Compiler.params.setOptions(options);

		Compiler.functions = ace.edit("functions");
	    Compiler.functions.setTheme("ace/theme/chrome");
	    Compiler.functions.session.setMode("ace/mode/javascript");
	    Compiler.functions.setOptions(options);

		Compiler.output = ace.edit("output");
	    Compiler.output.setTheme("ace/theme/chrome");
	    Compiler.output.session.setMode("ace/mode/pgsql");
	    Compiler.output.setOptions(options);
	},
	compileAndShow: function() {
		var compilerOutput = Compiler.compile(Compiler.source.getValue(), Compiler.params.getValue(), Compiler.functions.getValue());

		if(!compilerOutput.success) {
			Materialize.toast(compilerOutput.error,3000,"red");
			Compiler.output.setValue(compilerOutput.output);
			return false;
		}

		Compiler.output.setValue(compilerOutput.output);
	

		Compiler.output.selectAll();
		Compiler.output.focus();

		Materialize.toast("Done!", 2000, "green");
	},
	compile: function(source, params, functions) {
		if(!source) {
			return "";
		}

		if(!params) {
			return source;
		}

		var paramsInitArr = params.split("\n\n"),
			output = source,
			response = {success: true};

		$.map(paramsInitArr, function(param) {
			var pair = param.split(":\n");

			var key = pair[0],
				value = pair[1];

			output = output.replace(new RegExp(key, "gi"), value);
		});

		if(functions) {
			var functionsInSource = output.match(/\$[^\s)(]+\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi);
			$.map(functionsInSource, function(func) {
				var fn = func.replace(/\$/gi,"");

				var fns = functions + "\n" + fn + ";";

				try {
					var result = eval(fns);
				} catch(e) {
					console.error(e);
					response.success = false;
					response.error = e;
				}

				output = output.replace(func, result);
			});
		}

		response.output = output;

		return response;
	},
	save: function(){
		var state = {
			source: Compiler.source.getValue(),
			params: Compiler.params.getValue(),
			functions: Compiler.functions.getValue(),
			output: Compiler.output.getValue()
		};
		var element = document.createElement('a');
		  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(state)));
		  element.setAttribute('download', Compiler.fileName);

		  element.style.display = 'none';
		  document.body.appendChild(element);

		  element.click();

		  document.body.removeChild(element);
	},
	loadFromFile: function(element){
		function getAsText(readFile) {

		  var reader = new FileReader();

		  reader.readAsText(readFile, "UTF-8");

		  // Handle progress, success, and errors
		  reader.onprogress = updateProgress;
		  reader.onload = loaded;
		  reader.onerror = errorHandler;
		}

		function updateProgress(evt) {
		  if (evt.lengthComputable) {
		    // evt.loaded and evt.total are ProgressEvent properties
		    var loaded = (evt.loaded / evt.total);
		    if (loaded < 1) {
		      // Increase the prog bar length
		      // style.width = (loaded * 200) + "px";
		    }
		  }
		}

		function loaded(evt) {
		  // Obtain the read file data
		  var fileString = evt.target.result;

		  Compiler.fileName = $('#load').prop('files')[0].name;

		  Compiler.load(fileString);

		  Materialize.toast("Loaded!",2000,"green");
		}

		function errorHandler(evt) {
		  if(evt.target.error.name == "NotReadableError") {
		    // The file could not be read
		    Materialize.toast("Error loading file!",3000,"red");
		  }
		}

		var file = $('#load').prop('files')[0];
		if(file){
			getAsText(file);
		}
	},
	load: function(text) {
		var state = JSON.parse(text);

		Compiler.source.setValue(state.source);
		Compiler.params.setValue(state.params);
		Compiler.functions.setValue(state.functions);
		Compiler.output.setValue(state.output);
	},
	UI: {
		maximizeMinimize(e){
			if(e){
				var tgt = $(e.target);
				tgt.closest(".col").toggleClass("m4");
			} else {
				tgt = $(".minmax-btn");
				if(!tgt.length){
					return false;
				}
				if($(tgt[0]).closest(".col").hasClass("m4")){
					tgt.closest(".col").removeClass("m4");
				} else {
					tgt.closest(".col").addClass("m4");
				}
			}

			Compiler.source.resize();
			Compiler.params.resize();
			Compiler.functions.resize();
			//TODO FIXME quick hack to implement maximize support
		}
	}
}

$(window).bind('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch (String.fromCharCode(event.which).toLowerCase()) {
        case 's':
            event.preventDefault();
            Compiler.save();
            break;
        case 'o':
            event.preventDefault();
            $("#load").click();
            break;
        }
    }
});

$(document).ready(function () {
	Compiler.init();
});