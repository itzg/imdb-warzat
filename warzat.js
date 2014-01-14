////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////

var AvailableAt = {};

AvailableAt.Invoker = function(accessor) {
	$.extend(this, accessor);
}

AvailableAt.Invoker.prototype = {
	invoke: function(url, parameters, context, dataType, handler, errorHandler) {
	    var message = { 
	    		method: "GET",
				action: url
              };
	    message.parameters = parameters;

		OAuth.completeRequest(message, this);
		
		var urlToCall = message.action + "?" + 
		OAuth.formEncode(message.parameters);
		
		$.ajax(urlToCall, {
			success: handler,
			error: errorHandler,
			context: context,
			dataType: dataType
		});
	}
}

////////////////////////////////////////////////////////////////////////////////

var ProgressTooltip = {
	searchers: [],
	jqObj: null,
	ourHeaderCell: null
};
	
ProgressTooltip.addSearcher = function(searcher) {
	ProgressTooltip.searchers.push(searcher);
};

ProgressTooltip.stopAll = function() {
	var action = new Action();
	action.set("what", "requested-stop");
	action.save();

	for (var i = 0; i < ProgressTooltip.searchers.length; ++i) {
		ProgressTooltip.searchers[i].stop();
	}
};
	
ProgressTooltip.update = function() {
	var maxRemaining = 0;
	var searchers = ProgressTooltip.searchers;
	
	for (var i = 0; i < searchers.length; ++i) {
		if (!searchers[i].isStopped()) {
			var remaining = searchers[i].getRemainingCount();
			if (remaining > maxRemaining) {
				maxRemaining = remaining;
			}
		}
	}
	
	if (maxRemaining > 0) {
		if (ProgressTooltip.jqObj == null) {
			ProgressTooltip.jqObj = $("<div id='warzatProgressPopup'>" +
					"<div style='margin-bottom:5px'>"+
					"<span id='warzatProgressCount'>.</span> left to lookup. <a href='#' id='btnStopWarzat'>Stop</a>" +
					"</div>"+
					"<div style='font-size: smaller; text-align:center;'><a id='warzatOptionsLink' href='#'>Options...</a></div>"+
				"</div>").appendTo("body");
			
			// Setup options page link
			$("#warzatOptionsLink", ProgressTooltip.jqObj).click(function(evt) {
				evt.preventDefault();
				chrome.runtime.sendMessage({action:'show', target:'options'});
			});
			
			ProgressTooltip.jqObj.position({
				my: "left bottom",
				at: "left top-15",
				of: ProgressTooltip.ourHeaderCell,
				collision: "none"
			});
			ProgressTooltip.jqObj.show("fade");
		
			$("#btnStopWarzat").click(function(evt){
				evt.preventDefault();
				ProgressTooltip.stopAll();
			});
		}
		$("#warzatProgressCount").text(maxRemaining);
	}
	else if (ProgressTooltip.jqObj != null) {
		ProgressTooltip.jqObj.hide("puff");
		ProgressTooltip.jqObj = null;
	}
};

////////////////////////////////////////////////////////////////////////////////

function Searcher(context, rows, accessor, minRowPeriod, badgeImage, clickThruId) {
	this.context = context;
	// Need a copy of the given array so each searcher works off its own list
	this.rows = rows.slice(0);
	this.accessor = accessor;
	this.minRowPeriod = minRowPeriod;
	this.needsToStop = false;
	this.badgeImage = badgeImage;
	this.lastInvocation = Date.now();
	this.clickThruId = clickThruId;
}

Searcher.prototype = {
	readyForNext: function(handler) {
		ProgressTooltip.update();

		// see if stop flagged is raised
		if (this.needsToStop) {
			// just return to the effectively terminate the loop
			return;
		}
		
		var oThis = this;
		
		// Compute the actual timeout needed taking into account the
		// time it took for the previous AJAX operations to execute.
		var nextInvocation = this.lastInvocation + this.minRowPeriod;
		var now = Date.now();
		var timeToWait = nextInvocation - now;
		this.lastInvocation = now;
		
		setTimeout(function() {
			if (oThis.needsToStop) {
				ProgressTooltip.update();
				return;
			}
			
			var type="";
			var row;
			
			while (type != "Feature" && type != "Documentary" && type != "TV Series") {
				row = oThis.rows.shift();
				
				if (row == undefined) {
					ProgressTooltip.update();
					return;
				}
				type = $("td.title_type", row).text().trim();
			}
			
			var title = $("td.title > a", row).text();
			
			var rowDetails = {
				row: row,
				title: title,
				type: type,
				releaseYear: $("td.year", row).text()
			}

			handler.call(oThis.context, rowDetails);
		}
		// Last call may have been slow, so we'll cap the minimum timeout at 10ms
		, Math.max(10, timeToWait));
	},
	
	addBadge: function(rowDetails, webPageHref) {
		var imgUrl = chrome.extension.getURL("images/"+this.badgeImage);
//		console.log("Adding badge", this.badgeImage, webPageHref);
		var cell = $(rowDetails.row).find("td.availableAt")
		cell.append("<div><a target='_blank' href='" + webPageHref + "'><img title='View product page in a new window' src='" +
				imgUrl + "'></img></a></div>");
		
		var that = this
		cell.find("a").click(function() {
			var action = new Action();
			action.set("what", "clicked-"+that.clickThruId);
			action.save();
		});
	},
	
	addFreeformBadge: function(rowDetails, content) {
		$(rowDetails.row).find("td.availableAt")
		.append(content);
	},
	
	stop: function() {
		// raise the stop flag to squash the next readyForNext
		this.needsToStop = true;
	},
	
	isStopped: function() {
		return this.needsToStop || this.rows.length == 0;
	},
	
	getRemainingCount: function() {
		return this.rows.length;
	}
}

////////////////////////////////////////////////////////////////////////////////

function Netflix(rows) {
	function formatCallback(formatDataXml) {
		var rowDetails = this;
//		console.info(formatData);
		
		var instantWatchInfo = $(formatDataXml).find("availability:has(category[term='instant'])");
		
		var nowSec = Date.now() / 1000;

		var instantWatchCount = instantWatchInfo.length;
		var availableFrom = instantWatchInfo.attr("available_from");
		var availableUntil = instantWatchInfo.attr("available_until");
		
//		console.log(rowDetails, instantWatchCount, nowSec, availableFrom, availableUntil);
		
		if (instantWatchCount > 0
				&& nowSec > availableFrom
				&& nowSec < availableUntil) {
			var webPageHref = $(rowDetails.titleXml).find("link[rel='alternate']").attr("href");
			
			rowDetails.me.searcher.addBadge(rowDetails, webPageHref);
		}
		
		rowDetails.me.searcher.readyForNext(nextRow);
	}
	
	function titlesCallback(dataXml) {
    	var rowDetails = this;
    	
//    	console.info(rowDetails.title, data);
    	var title = null;
    	$(dataXml).find("catalog_title").each(function(candidate) {
    		var candidateTitle = $("title", this).attr("short");
    		var candidateYear = $("release_year", this).text();
    		if (candidateTitle == rowDetails.title && candidateYear == rowDetails.releaseYear) {
    			title = $(this);
    			return false;
    		}
    	});
    	
    	if (title == null) {
//    		console.log("No matching years for "+rowDetails.title);
    		rowDetails.me.searcher.readyForNext(nextRow);
    		return;
    	}
    	
    	var link = title.find("link[rel='http://schemas.netflix.com/catalog/titles/format_availability']");
    	var href = link.attr("href");
//    	console.info(title, link.length, link, href);
    	
    	rowDetails.titleXml = title;
    	
		if (href === undefined) {
    		rowDetails.me.searcher.readyForNext(nextRow);
			return;
		}
		
		rowDetails.me.invoker.invoke(href, [], rowDetails, "xml", formatCallback, errorCallback);
	}
	
	function errorCallback(jqXHR, textStatus, errorThrown) {
		console.error("Netflix query failed", this, textStatus, errorThrown);
		this.me.searcher.readyForNext(nextRow);
	}
	
	function nextRow(rowDetails) {
		rowDetails.me = this;
		
		var parameters = [];
	    parameters.push(["term", rowDetails.title]);
	    parameters.push(["start_index", "0"]);
	    // Since Netflix doesn't provide an exact match query, we'll get a few
	    // back and then find the exact title and release year match. At least
	    // it gives these back in best match order.
	    parameters.push(["max_results", "10"]);
	    
	    this.invoker.invoke("http://api-public.netflix.com/catalog/titles", parameters, rowDetails, "xml", 
	    		titlesCallback, errorCallback);
	}
	
	this.searcher = new Searcher(this, rows, netflixAccessor, 
			250, // Netflix allows 10 calls per sec and it takes 2 per row
			"Netflix.png", "netflix");
	ProgressTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRow);
	this.invoker = new AvailableAt.Invoker(netflixAccessor);
}

////////////////////////////////////////////////////////////////////////////////

function Redbox(rows, options) {
	// Set options
	this["zip-code"] = 0;
	this["search-radius"] = 0;
	$.extend(this, options);

	// Redbox is crazy slow, so we'll trim the search list aggressively
	var rowsToSearch = rows.slice(0, Math.min(maxRows, rows.length));
	this.searcher = new Searcher(this, rowsToSearch, redboxAccessor, 
			250,
			"Redbox.png", "redbox"
			);
	ProgressTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRow);
	
	//// Private Methods ////
	
	function addBadge(rowDetails, websiteUrl) {
		rowDetails.me.searcher.addBadge(rowDetails, websiteUrl);
	}
	
	function queryByZipcodeCallback(data) {
		var rowDetails = this;
		
		var storeInventory = data.Inventory.StoreInventory;
		if (storeInventory != undefined) {
			for (var si = 0; si < storeInventory.length; ++si) {
				if (storeInventory[si].ProductInventory["@inventoryStatus"] == "InStock") {
					addBadge(rowDetails, rowDetails.websiteUrl);
					break;
				}
			}
		}
	}
	
	// NOTE: this will be processed concurrently with next row's request
	function processAvailableAt(rowDetails, productId, websiteUrl) {
		if (rowDetails.me["zip-code"] > 0) {
			rowDetails.websiteUrl = websiteUrl;
			$.ajax("https://api.redbox.com/v3/inventory/stores/postalcode/"+rowDetails.me["zip-code"], {
				data: {
					apiKey: rowDetails.me.searcher.accessor.apiKey,
					products: productId,
					radius: rowDetails.me["search-radius"]
				},
				context: rowDetails,
				success: queryByZipcodeCallback,
				error: errorCallback,
				headers: {"Accept":"application/json"},
				dataType: "json"
			});

		}
		else {
			addBadge(rowDetails, websiteUrl);
		}
		
	}

	function queryCallback(data) {
		var rowDetails = this;
		
		var moviesResult = data.Products.Movie;
		
		if (moviesResult != undefined) {
			// Normalize the variable to be an array. If only one is returned, then
			// Redbox gives us a single field.
			if (!$.isArray(moviesResult)) {
				moviesResult = [ moviesResult ];
			}
			var dvdPos = -1;
			var blurayPos = -1;
			
			// Scans formats provided
			for (var i = 0; i < moviesResult.length; ++i) {
				
				// Need to look for exact match of title and release year. We'll get
				// substring matches back from Redbox and could get prior releases
				// with same title.
				if ((moviesResult[i]["Title"] == rowDetails.title 
							|| moviesResult[i]["Title"] == rowDetails.title+" ("+rowDetails.releaseYear+")")
						&& moviesResult[i]["ReleaseYear"] == rowDetails.releaseYear) {
					var format = moviesResult[i]["@format"];
					if (format == "DVD") {
						dvdPos = i;
					}
					else if (format == "Blu-ray") {
						blurayPos = i;
					}
				}
			}
			
			// ...we'll prefer DVD
			var moviesResultPos = dvdPos != -1 ? dvdPos : blurayPos;
			if (moviesResultPos != -1) {
				var flags = moviesResult[moviesResultPos].Flags.Flag;

				flags.forEach(function(flag) {
					if (flag["@type"] == "AvailableAtRedbox") {
						var now = Date.now();
						var beginDate = flag["@beginDate"];
						var endDate = flag["@endDate"];
						if (beginDate != undefined && Date.parse(beginDate) < now) {
							if (endDate == undefined || Date.parse(endDate) > now) {
								processAvailableAt(rowDetails, 
										moviesResult[moviesResultPos]["@productId"],
										moviesResult[moviesResultPos]["@websiteUrl"]);
							}
						}
					}
				});
			}
			else {
				console.debug("Didn't find expected format", moviesResult, rowDetails);
			}
		}
		
		rowDetails.me.searcher.readyForNext(nextRow);
	}
	
	function errorCallback(jqXHR, textStatus, errorThrown) {
		console.error("Redbox query failed", this, textStatus, errorThrown);
		this.me.searcher.readyForNext(nextRow);
	}
	
	function nextRow(rowDetails) {
		rowDetails.me = this;
		
		$.ajax("https://api.redbox.com/v3/products", {
			data: {
				apiKey: this.searcher.accessor.apiKey,
				q: rowDetails.title,
				productTypes: "Movies"
			},
			context: rowDetails,
			success: queryCallback,
			error: errorCallback,
			headers: {"Accept":"application/json"},
			dataType: "json"
		});
	}
}

////////////////////////////////////////////////////////////////////////////////

function Hulu(rows) {
	function queryCallback(xmlData) {
		var rowDetails = this;
		
		var videoXml = null;
		// Need to find the one with an exact match
		$(xmlData).find("results > videos > video").each(function() {
			if ($(this).find("show > name").text() == rowDetails.title) {
				videoXml = $(this);
				return false; // break out of each-loop
			}
		})
		
		if (videoXml != null) {
			var huluPlusIndicator = videoXml.find("show > has-plus-living-room");
			if (huluPlusIndicator.length > 0 && huluPlusIndicator.text() == "true") {
				var urlName = videoXml.find("show > canonical-name");
				var url = "#";
				if (urlName.length > 0) {
					url = "http://www.hulu.com/" + urlName.text();
				}
				rowDetails.me.searcher.addBadge(rowDetails, url);
			}
		}
		
		rowDetails.me.searcher.readyForNext(nextRowCallback);
	}
	
	function errorCallback(jqXHR, textStatus, errorThrown) {
		console.error("Hulu query failed", this, textStatus, errorThrown);
		this.me.searcher.readyForNext(nextRowCallback);
	}
	
	function nextRowCallback(rowDetails) {
		if (rowDetails.type != "TV Series") {
			this.searcher.readyForNext(nextRowCallback);
			return;
		}
		
		rowDetails.me = this;
		
		$.ajax("http://m.hulu.com/search", {
			data: {
				"dp_identifier": "Hulu",
			    "query": rowDetails.title,
			    "items_per_page": this.itemsPerPage,
			    "page": "1"
			},
			context: rowDetails,
			success: queryCallback,
			error: errorCallback,
			dataType: "xml"
		});
	}
	
	this.itemsPerPage = 10;
	
	this.searcher = new Searcher(this, rows, null, 
			250,
			"Hulu.png",
			"hulu"
			);
	ProgressTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRowCallback);
}

function isServiceEnabled(serviceId) {
	var enabled = localStorage["warzat-"+serviceId];
	return enabled === undefined || enabled == "true";
}

////////////////////////////////////////////////////////////////////////////////
// MAIN

var compactList = $("div.list_titles div.list.compact");
var maxRows = optionValues["search-limit"];

if (compactList.length > 0) {
	var action = new Action();
	action.set("what", "used-compactList");
	action.save();

	// Make room for our column
	$("th.num_votes").remove();
	$("td.num_votes").remove();
	$("th.created").remove();
	$("td.created").remove();
	
	$("th.title", compactList).after("<th class='availableAt'>Warzat?</th>");
	ProgressTooltip.ourHeaderCell = $("th.availableAt", compactList);
	$("td.title", compactList).after("<td class='availableAt' style='text-align: left'></td>");
	
	chrome.storage.sync.get(optionValues, function(savedValues) {
		
		if (savedValues["search-limit"]) {
			maxRows = savedValues["search-limit"];
		}
		
		var rows = $.makeArray($("tr.list_item"));
		// Remove header row.
		rows.shift();
		if (rows.length > maxRows) {
			rows.splice(maxRows);
		}

		savedValues["service-netflix"] && new Netflix(rows);
		savedValues["service-redbox"] && new Redbox(rows, savedValues);
		savedValues["service-hulu"] && new Hulu(rows);
		savedValues["service-tv"] && new TvListingsQuery(rows, savedValues);
	});
	
}
else {
	var action = new Action();
	action.set("what", "used-other-viewType");
	action.save();
}
