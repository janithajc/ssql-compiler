var Compiler = {
	compileBtn : $("#compile"),
	source: null,
	params: null,
	functions: null,
	output: null,
	fileName: "sqlCompilerState.json",
	loadedMods: [],
	modsToRemove: [],
	init: function(){
		var options = {
	        enableBasicAutocompletion: true,
	        enableSnippets: true,
	        enableLiveAutocompletion: false,
	        setAutoScrollEditorIntoView: true,
	        maxLines: 30,
	        minLines: 10
	    };
	    $('.modal').modal();
	    $('.tooltipped').tooltip({delay: 50});
    	$('.button-collapse').sideNav();
    	$('.minmax-btn').on('click', Compiler.UI.maximizeMinimize);
    	$('.fullscreen-btn').on('click', Compiler.UI.toggleFullScreen);
    	$('#load').on('change', Compiler.loadFromFile);
		Compiler.compileBtn.on("click", Compiler.compileAndShow);

		Compiler.source = ace.edit("source");
	    Compiler.source.setTheme("ace/theme/chrome");
	    Compiler.source.session.setMode("ace/mode/ssql");
	    Compiler.source.setOptions(options);
	    Compiler.UI.updateProgress(25);

		Compiler.params = ace.edit("params");
	    Compiler.params.setTheme("ace/theme/chrome");
	    Compiler.params.session.setMode("ace/mode/sql");
	    Compiler.params.setOptions(options);
		Compiler.UI.updateProgress(50);

		Compiler.functions = ace.edit("functions");
	    Compiler.functions.setTheme("ace/theme/chrome");
	    Compiler.functions.session.setMode("ace/mode/javascript");
	    Compiler.functions.setOptions(options);
		Compiler.UI.updateProgress(75);

		Compiler.output = ace.edit("output");
	    Compiler.output.setTheme("ace/theme/chrome");
	    Compiler.output.session.setMode("ace/mode/pgsql");
	    Compiler.output.setOptions(options);
	    Compiler.UI.updateProgress(100);

	    Compiler.UI.hideProgress();
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
			var functionsInSource = output.match(/\$[^\s)(]+\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi) || [];
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
			output: Compiler.output.getValue(),
			modules: Compiler.moduleLoader.loadedModules
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
		      Compiler.UI.updateProgress(loaded*100);
		    }
		  }
		}

		function loaded(evt) {
		  // Obtain the read file data
		  var fileString = evt.target.result;

		  Compiler.UI.hideProgress();

		  Compiler.fileName = $('#load').prop('files')[0].name;

		  Compiler.load(fileString);
		  
		}

		function errorHandler(evt) {
		  if(evt.target.error.name == "NotReadableError") {
		    // The file could not be read
		    Materialize.toast("Error loading file!",3000,"red");
		    Compiler.UI.hideProgress();
		  }
		}

		var file = $('#load').prop('files')[0];
		if(file){
			getAsText(file);
			Compiler.UI.showProgress();
		}
	},
	load: function(text) {
		try{

			var state = JSON.parse(text);

			Compiler.source.setValue(state.source);
			Compiler.params.setValue(state.params);
			Compiler.functions.setValue(state.functions);
			Compiler.output.setValue(state.output);

			Compiler.loadModules(state.modules, true);

			Materialize.toast("Loaded!",2000,"green");
		} catch (e) {
			console.log(e);
			Materialize.toast("Invalid file selected!", 3000, "red");
		}
	},
	loadModules: function(modules, init){
		if(modules) {
			$.map(modules, function(m){
				if($.inArray(m.name,Compiler.loadedMods) < 0) {
					Compiler.moduleLoader.loadModule(m.url, m.name);
					Compiler.loadedMods.push(m.name);
					if(init){
						Compiler.UI.moduleLoader.addModule(m.name,m.url);
					}
				}
			});
		}
	},
	UI: {
		progressBar: $("#progress-bar"),
		progressBarInner: $("#progress-bar").find("div"),
		showProgress: function(indeterminate){
			Compiler.UI.progressBar.removeClass("hide");
			if(indeterminate) {
				Compiler.UI.progressBarInner.removeClass("determinate");
				Compiler.UI.progressBarInner.addClass("indeterminate");
			} else {
				Compiler.UI.progressBarInner.removeClass("indeterminate");
				Compiler.UI.progressBarInner.addClass("determinate");
			}
		},
		hideProgress: function(){
			Compiler.UI.progressBar.addClass("hide");
		},
		updateProgress: function(percent){
			Compiler.UI.progressBarInner.css('width', percent+"%");
		},
		maximizeMinimize(e){
			if(e){
				var tgt = $(e.target);
				tgt.closest(".source-view").toggleClass("m4");
			} else {
				tgt = $(".minmax-btn");
				if(!tgt.length){
					return false;
				}
				if($(tgt[0]).closest(".source-view").hasClass("m4")){
					tgt.closest(".source-view").removeClass("m4");
				} else {
					tgt.closest(".source-view").addClass("m4");
				}
			}

			Compiler.source.resize();
			Compiler.params.resize();
			Compiler.functions.resize();
			//TODO FIXME quick hack to implement maximize support
		},
		toggleFullScreen(e){
			if(e){
				var tgt = $(e.target);
				tgt.closest(".source-view").toggleClass("full-screen");
				if(tgt.closest(".source-view").hasClass("full-screen")) {
					var preHeight = $(".full-screen").innerHeight();
					$("pre").css("height", "calc(" + preHeight + "px - 100px)");
					$("body").css("overflow", "hidden");
				} else {
					$("pre").css("height","");
					$("body").css("overflow", "auto");
				}
			}

			Compiler.source.resize();
			Compiler.params.resize();
			Compiler.functions.resize();
		},
		showModuleLoader(){
			$('#moduleModal').modal('open');
		},
		hideModuleLoader(){
			$('#moduleModal').modal('close');
		},
		moduleLoader: {
			template: $(".module").detach(),
			parent: $("#loadedModules"),
			addModule(name, url){
				var that = Compiler.UI.moduleLoader;

				var module = that.template.clone();

				module.find(".mod_name").val(name);
				module.find(".mod_url").val(url);

				module.on("click", ".remove", function(e) {
					var name = $(this).find(".mod_name").val();

					if(name !== undefined){
						Compiler.modsToRemove.push(name);
					}

					$(this).closest(".module").remove();
				});

				that.parent.append(module);

				Materialize.updateTextFields();
			},
			apply(){
				var that = Compiler.UI.moduleLoader;

				var mods = [];

				that.parent.find(".module").each(function(){
					var m = $(this);
					mods.push({name: m.find(".mod_name").val(), url: m.find(".mod_url").val()});
				});

				Compiler.modsToRemove.map(function(name){
					Compiler.loadedMods = $.grep(Compiler.loadedMods, function(n) {
						return n !== name;
					});
					Compiler.moduleLoader.loadedModules = $.grep(Compiler.moduleLoader.loadedModules, function(m){
						return m.name != name;
					});
				});

				Compiler.modsToRemove = [];

				Compiler.loadModules(mods, false);
			}
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
        case 'e':
            event.preventDefault();
            Compiler.compileAndShow();
            break;
        case 'm':
            event.preventDefault();
            Compiler.UI.showModuleLoader();
            break;
        }
    }
});

$(document).ready(function () {
	Compiler.init();
});
