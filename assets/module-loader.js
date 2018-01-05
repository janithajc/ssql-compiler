Compiler.moduleLoader = {
	loadedModules: [],
	loadModule: function(url, name){
		if(name === undefined) {
			name = "Module-"+Compiler.moduleLoader.loadedModules.length;
		}
		Compiler.UI.showProgress(true);
		$.getScript( url )
		  .done(function( script, textStatus ) {
			Materialize.toast("Module: "+name+" loaded!", 2000, "light-blue");
			Compiler.moduleLoader.loadedModules.push({
				name: name,
				url: url
			});
		  })
		  .fail(function( jqxhr, settings, exception ) {
		    Materialize.toast("Loading Module:'"+ name +"' from URL: "+ url +" failed!", 5000, "orange");
		}).always(function(){
			Compiler.UI.hideProgress();
		});
	}
};