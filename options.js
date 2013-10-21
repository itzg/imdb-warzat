
$(document).ready(function() {
	
	$(".hidden").hide();

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
		saveOptions();
	});
	
	$("#service-redbox").change(function(evt) {
		$("#redbox-settings").toggle($("#service-redbox").get(0).checked);
	});
	
	setupTvListings();
	
	loadOptions();
});

function saveOptions() {
	var valuesToSave = {};
	for (var optionId in optionValues) {
		if (optionId.indexOf("service-") == 0) {
			valuesToSave[optionId] = $("#"+optionId).get(0).checked;
		}
		else {
			valuesToSave[optionId] = $("#"+optionId).val();
		}
	}
	
	chrome.storage.sync.set(valuesToSave, function() {
		$("#saved-alert").show();
		setTimeout(function() {
			$("#saved-alert").fadeOut();
		}, 2000);
	});
}

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


function setupTvListings() {
	
	function setupChannels() {
		if (!TvListings.serviceId) {
			return;
		}
		
		$("#tv-channels-controls").empty();
		
		var sel = $("<input id='tv-sources' type='hidden' style='width:500px'/>");
		sel.appendTo("#tv-channels-controls");
		
		sel.select2({
			placeholder: "Choose channels to search",
			allowClear: true,
			multiple: true,
			closeOnSelect: false,
			ajax: {
				url: "http://api.rovicorp.com/TVlistings/v9/listings/servicedetails/serviceid/"+TvListings.serviceId+"/info",
                dataType: 'json',
                cache: true,
				data: function (term, page) {
                    return {
	                	locale: "en-US",
	                	countrycode: "US",
	                	format: "json",
	                	apikey: TvListings.apiKey,
	                	sig: TvListings.sig(),
	                	includechannelimages: "true",
	                	imageformatid: 31 /* 40x40, logo */
                    };
                },
				results: function(data) {
					return {results: $.map(data.ServiceDetailsResult.ChannelLineup.Channels, function(channel){
						return {
							id: channel.SourceId,
							channelNumber: channel.Channel,
							displayName: channel.DisplayName
						};
					})};
				}
			}, // end ajax
			matcher: function(term, text, option) {
				
				return false;
			},
			formatResult: function(object, container, query) {
				return "<div>("+object.channelNumber+") "+object.displayName+"</div>";
			},
			formatSelection: function(object, container) {
				return "<div>"+object.displayName+"</div>";
			}

		});
		
		$("#tv-channels-group").show();
		sel.select2("open");
	}
	
	function setupProviders() {
		$("#tv-provider-controls").empty();
		$("#tv-channels-group").hide();
		TvListings.serviceId = null;
		
		var zipcode = $("#zip-code").val();
		// extra saftey
		if (zipcode.length != 5) {
			return;
		}
		
		// For custom data loading, they say use this rather than <select/>
		var sel = $("<input id='tv-provider' type='hidden' style='width:500px'/>");
		sel.appendTo("#tv-provider-controls");
		
		sel.select2({
			placeholder: "Choose your provider",
            ajax: {
                url: "http://api.rovicorp.com/TVlistings/v9/listings/services/postalcode/"+zipcode+"/info",
                dataType: 'json',
                cache: true,
                data: function (term, page) {
                    return {
                    	locale: "en-US",
                    	countrycode: "US",
                    	format: "json",
                    	apikey: TvListings.apiKey,
                    	sig: TvListings.sig()
                    };
                },
                results: function (data, page) { 
                    return {results: $.map( data.ServicesResult.Services.Service, function(service){
                    	return {id: service.ServiceId, text: service.Name};
                    })};
                }
            }
			
		});
		
		sel.change(function() {
			TvListings.serviceId = sel.val();
			setupChannels();
		});
		
		
		$("#tv-provider-group").show();
	}
	
	$("#service-tv").change(function(evt){
		TvListings.enabled = $("#service-tv").get(0).checked;
		$("#tv-settings").toggle(TvListings.enabled);
	});
	
	$("#zip-code").change(function(evt) {
		if ($("#zip-code").val().length == 5) {
			$("#missing-zip-code-note").hide();
			if (TvListings.enabled) {
				setupProviders();
			}
		}
		else {
			$("#missing-zip-code-note").show();
		}
	});
}