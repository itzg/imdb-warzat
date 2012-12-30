
$(document).ready(function() {
	loadOptions();
	
	$("#save").click(function(evt) {
		evt.preventDefault();
		
		var valuesToSave = {};
		for (var optionId in optionValues) {
			if (optionId.indexOf("service-") == 0) {
				valuesToSave[optionId] = $("#"+optionId).get(0).checked;
			}
			else {
				valuesToSave[optionId] = $("#"+optionId).val();
			}
		}
		valuesToSave["zip-code"] = $("#zip-code").val();
		
		chrome.storage.sync.set(valuesToSave, function() {
			$("#saved-alert").show();
			setTimeout(function() {
				$("#saved-alert").fadeOut();
			}, 2000);
		});
	});
});

function loadOptions() {
	chrome.storage.sync.get(optionValues, function(savedValues){
		console.log("got", savedValues);
		for (var optionId in savedValues) {
			console.log(optionId.toString());
			if (optionId.indexOf("service-") == 0) {
				$("#"+optionId).get(0).checked = savedValues[optionId];
			}
			else {
				$("#"+optionId).val(savedValues[optionId]);
			}
		}
	});
}
