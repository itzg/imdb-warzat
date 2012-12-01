

////////////////////////////////////////////////////////////////////////////////

var AvailableAt = {};

AvailableAt.Invoker = function(accessor) {
	$.extend(this, accessor);
}

AvailableAt.Invoker.prototype = {
	invoke: function(url, parameters, context, dataType, handler) {
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
				"<span id='warzatProgressCount'>.</span> left to lookup. <a href='#' id='btnStopWarzat'>Stop</a>" +
				"</div>").appendTo("body");
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

function Searcher(context, rows, accessor, minRowPeriod, badgeImage) {
	this.context = context;
	// Need a copy of the given array so each searcher works of its own list
	this.rows = rows.slice(0);
	this.accessor = accessor;
	this.minRowPeriod = minRowPeriod;
	this.needsToStop = false;
	this.badgeImage = badgeImage;
	this.lastInvocation = Date.now();
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
				type = $("td.title_type", row).text();
			}
			
			var title = $("td.title > a", row).text();
			
			var rowDetails = {
				row: row,
				title: title,
				releaseYear: $("td.year", row).text()
			}

			handler.call(oThis.context, rowDetails);
		}
		// Last call may have been slow, so we'll cap the minimum timeout at 10ms
		, Math.max(10, timeToWait));
	},
	
	addBadge: function(rowDetails, webPageHref) {
		var imgUrl = chrome.extension.getURL("images/"+this.badgeImage);
		console.log("Adding badge", this.badgeImage, webPageHref);
		$(rowDetails.row).find("td.availableAt")
		.append("<div><a target='_blank' href='" + webPageHref + "'><img title='View product page in a new window' src='" +
				imgUrl + "'></img></a></div>");

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
		
		rowDetails.me.invoker.invoke(href, [], rowDetails, "xml", formatCallback);
	}
	
	function errorCallback(jqXHR, textStatus, errorThrown) {
		console.error("Netflix query failed", this, textStatus, errorThrown);
		this.me.searcher.readyForNext(nextRow);
	}
	
	function nextRow(rowDetails) {
		rowDetails.me = this;
		
		//DEBUG
		if (rowDetails.title == "Hugo") {
			console.log("Netflix, looking", rowDetails);
		}
		var parameters = [];
	    parameters.push(["term", rowDetails.title]);
	    parameters.push(["start_index", "0"]);
	    parameters.push(["max_results", "10"]);
	    
	    this.invoker.invoke("http://api-public.netflix.com/catalog/titles", parameters, rowDetails, "xml", 
	    		titlesCallback, errorCallback);
	}
	
	this.searcher = new Searcher(this, rows, netflixAccessor, 
			250, // Netflix allows 10 calls per sec and it takes 2 per row
			"Netflix.png");
	ProgressTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRow);
	this.invoker = new AvailableAt.Invoker(netflixAccessor);
}

////////////////////////////////////////////////////////////////////////////////

function Redbox(rows) {
	function queryCallback(data) {
		var rowDetails = this;
		
		var moviesResult = data.Products.Movie;
		
		if (moviesResult != undefined && moviesResult.length > 0) {
			var flags = moviesResult[0].Flags.Flag;
			flags.forEach(function(flag) {
				if (flag["@type"] == "AvailableAtRedbox") {
					var now = Date.now();
					var beginDate = flag["@beginDate"];
					var endDate = flag["@endDate"];
					if (beginDate != undefined && Date.parse(beginDate) < now) {
						if (endDate == undefined || Date.parse(endDate) > now) {
							rowDetails.me.searcher.addBadge(rowDetails, moviesResult[0]["@websiteUrl"]);
						}
					}
				}
			});
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
	
	this.searcher = new Searcher(this, rows, redboxAccessor, 
			250,
			"Redbox.png"
			);
	ProgressTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRow);
}

////////////////////////////////////////////////////////////////////////////////
// MAIN

var compactList = $("div.list.compact");
var maxRows = 150;

if (compactList.length > 0) {
	// Make room for our column
	$("th.num_votes").remove();
	$("td.num_votes").remove();
	$("th.created").remove();
	$("td.created").remove();
	
	$("th.title", compactList).after("<th class='availableAt'>Warzat?</th>");
	ProgressTooltip.ourHeaderCell = $("th.availableAt", compactList);
	$("td.title", compactList).after("<td class='availableAt'></td>");
	
	var rows = $.makeArray($("tr.list_item"));
	if (rows.length > maxRows) {
		rows.splice(maxRows);
	}
	
	new Netflix(rows);
	new Redbox(rows);
}
