var options = 
	[
    "netflix",
    "redbox",
    "hulu"
	];

$(document).ready(function() {
	loadOptions();
	
	$("#save").click(function(evt) {
		evt.preventDefault();
		
		var valuesToSave = {};
		for (var i = 0; i < options.length; ++i) {
			var optionId = options[i];
			valuesToSave[optionId] = $("#"+optionId).get(0).checked;
			
			chrome.storage.sync.set(valuesToSave, function() {
				$("#saved-alert").show();
				setTimeout(function() {
					$("#saved-alert").fadeOut();
				}, 2000);
			});
		}
	});
});

function loadOptions() {
	var optionValues = {
		"netflix": true,
		"redbox": true,
		"hulu": true
	};
	chrome.storage.sync.get(optionValues, function(savedValues){
		console.log("got", savedValues);
		for (var optionId in savedValues) {
			$("#"+optionId).get(0).checked = savedValues[optionId];
		}
	});
}

function loadOption(optionId, enabled) {
	var checked = false;
	if (enabled === undefined || enabled == "true") {
		checked = true;
	}
	$("#"+optionId).get(0).checked = checked;
}
