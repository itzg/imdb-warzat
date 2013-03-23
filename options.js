
$(document).ready(function() {
	loadOptions();

	$("#search-limit").tooltip({
		trigger: "manual",
		title: "This is a free utility and the developer's API calls are metered. In turn your usage needs to be limited. Sorry."
	});
	
	$("#search-limit").blur(function() {
		var newLimit = new Number($("#search-limit").val());
		if (isNaN(newLimit)) {
			$("#search-limit").val(optionValues["search-limit"]);
		}
		else if (newLimit > maxSearchLimit) {
			$("#search-limit").tooltip("show");
			setTimeout(function() {
				$("#search-limit").tooltip("hide");
			}, 5000);
			$("#search-limit").val(maxSearchLimit);
		}
	});
	
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
		
		valuesToSave["search-limit"] = $("#search-limit").val();
		
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
