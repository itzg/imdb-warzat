
$(document).ready(function() {
	
	$(".hidden").hide();
	
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
		saveOptions();
	});
	
	$("#service-redbox").change(function(evt) {
		$("#redbox-settings").toggle($("#service-redbox").get(0).checked);
	});
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
		console.debug("Loaded", savedValues);
		for (var optionId in savedValues) {
			console.log(optionId.toString());
			if (optionId.indexOf("service-") == 0) {
				$("#"+optionId).get(0).checked = savedValues[optionId];
			}
			else {
				$("#"+optionId).val(savedValues[optionId]);
			}
		}
		
		setupTvListings(savedValues);
	});
}

function getZipCode() {
	return $("#zip-code").val();
}

function setupTvListings(savedValues) {
	
	// Setup initial state
	
	var enabled = isTvListingsEnabled();
	console.log("TV listings enabled", enabled);
	$("#tv-settings").toggle(enabled);
	handleZipCodeChange();
	setupChannels(false);
	
	// Register events
	
	$("#service-tv").change(function(evt){
		$("#tv-settings").toggle(isTvListingsEnabled());
	});
	
	$("#zip-code").change(handleZipCodeChange);
	
	// Private functions
	
	function handleZipCodeChange() {
		if (getZipCode().length == 5) {
			$("#missing-zip-code-note").hide();
			if (isTvListingsEnabled()) {
				setupProviders();
			}
		}
		else {
			$("#missing-zip-code-note").show();
		}
	}
	
	function setupChannels(autoOpen) {
		if (!getServiceId()) {
			return;
		}
		
		$("#tv-channels-controls").empty();
		
		var sel = $("<input id='tv-sources' type='hidden' style='width:500px'/>");
		sel.appendTo("#tv-channels-controls");
		sel.val(savedValues["tv-sources"]);

		sel.select2({
			placeholder: "Choose channels to search",
			allowClear: true,
			multiple: true,
			closeOnSelect: false,
			initSelection : function (element, callback) {
				
		        $.getJSON("http://api.rovicorp.com/TVlistings/v9/listings/servicedetails/serviceid/"+getServiceId()+"/info", {
                	locale: "en-US",
                	countrycode: "US",
                	format: "json",
                	apikey: TvListings.apiKey,
                	sig: TvListings.sig(),

		        })
		        .done(function(data){
		        	var results = [];
		        	var ourSourceIds = element.val().split(",");
		        	
		        	$.each(data.ServiceDetailsResult.ChannelLineup.Channels, function(i, channel) {
		        		if (ourSourceIds.indexOf(String(channel.SourceId)) >= 0) {
		        			results.push({
		        				id: channel.SourceId,
								channelNumber: channel.Channel,
								displayName: channel.DisplayName
		        			});
		        		}
		        	});
		        	
		        	callback(results);
		        });
		    },
			ajax: {
				url: "http://api.rovicorp.com/TVlistings/v9/listings/servicedetails/serviceid/"+getServiceId()+"/info",
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
		if (autoOpen) {
			sel.select2("open");
		}
	}
	
	function buildListingsServicesData() {
        return {
        	locale: "en-US",
        	countrycode: "US",
        	format: "json",
        	apikey: TvListings.apiKey,
        	sig: TvListings.sig()
        };
	}
	
	function buildServiceSelectRecord(service) {
		return {id: service.ServiceId, text: service.Name};
	}
	
	function setupProviders() {
		$("#tv-provider-controls").empty();
		$("#tv-channels-group").hide();
		
		var zipcode = getZipCode();
		// extra saftey
		if (zipcode.length != 5) {
			return;
		}
		
		// For custom data loading, they say use this rather than <select/>
		var sel = $("<input id='tv-provider' type='hidden' style='width:500px'/>");
		sel.appendTo("#tv-provider-controls");
		sel.val(savedValues["tv-provider"]);

		sel.select2({
			placeholder: "Choose your provider",
			initSelection : function (element, callback) {
		        
		        $.getJSON("http://api.rovicorp.com/TVlistings/v9/listings/services/postalcode/"+zipcode+"/info", buildListingsServicesData())
		        .done(function(data){
		        	var ourServiceId = getServiceId();
		        	$.each(data.ServicesResult.Services.Service, function(i, service){
		        		if (service.ServiceId == ourServiceId) {
		        			callback(buildServiceSelectRecord(service));
		        			return false;
		        		}
		        	});
		        });
		    },
            ajax: {
                url: "http://api.rovicorp.com/TVlistings/v9/listings/services/postalcode/"+zipcode+"/info",
                dataType: 'json',
                cache: true,
                data: function (term, page) {
                	return buildListingsServicesData();
                },
                results: function (data, page) { 
                    return {results: $.map( data.ServicesResult.Services.Service, function(service){
                    	return {id: service.ServiceId, text: service.Name};
                    })};
                }
            }
			
		});
		
		sel.change(function() {
			setupChannels(true);
		});
		
		$("#tv-provider-group").show();
	}
	
	function getServiceId() {
		return Number($("#tv-provider").val());
	}
	
	function isTvListingsEnabled() {
		return $("#service-tv").get(0).checked;
	}
}