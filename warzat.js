

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

var ProcessTooltip = {
	searchers: [],
	jqObj: null,
	ourHeaderCell: null
};
	
ProcessTooltip.addSearcher = function(searcher) {
	ProcessTooltip.searchers.push(searcher);
};

ProcessTooltip.stopAll = function() {
	for (var i = 0; i < ProcessTooltip.searchers.length; ++i) {
		ProcessTooltip.searchers[i].stop();
	}
};
	
ProcessTooltip.update = function() {
	var maxRemaining = 0;
	var searchers = ProcessTooltip.searchers;
	
	for (var i = 0; i < searchers.length; ++i) {
		if (!searchers[i].isStopped()) {
			var remaining = searchers[i].getRemainingCount();
			if (remaining > maxRemaining) {
				maxRemaining = remaining;
			}
		}
	}
	
	if (maxRemaining > 0) {
		if (ProcessTooltip.jqObj == null) {
			ProcessTooltip.jqObj = $("<div id='warzatProgressPopup'>" +
				"<span id='warzatProgressCount'>.</span> left to lookup. <a href='#' id='btnStopWarzat'>Stop</a>" +
				"</div>").appendTo("body");
			ProcessTooltip.jqObj.position({
				my: "left bottom",
				at: "left top-15",
				of: ProcessTooltip.ourHeaderCell,
				collision: "none"
			});
			ProcessTooltip.jqObj.show("fade");
		
			$("#btnStopWarzat").click(function(evt){
				evt.preventDefault();
				ProcessTooltip.stopAll();
			});
		}
		$("#warzatProgressCount").text(maxRemaining);
	}
	else if (ProcessTooltip.jqObj != null) {
		ProcessTooltip.jqObj.hide("puff");
		ProcessTooltip.jqObj = null;
	}
};

////////////////////////////////////////////////////////////////////////////////

function Searcher(context, rows, accessor, minRowPeriod) {
	this.context = context;
	this.rows = rows;
	this.accessor = accessor;
	this.minRowPeriod = minRowPeriod;
	this.needsToStop = false;
}

Searcher.prototype = {
	readyForNext: function(handler) {
		ProcessTooltip.update();

		// see if stop flagged is raised
		if (this.needsToStop) {
			// just return to the effectively terminate the loop
			return;
		}
		
		var oThis = this;
		setTimeout(function() {
			if (oThis.needsToStop) {
				ProcessTooltip.update();
				return;
			}
			
			var type="";
			var row;
			
			while (type != "Feature" && type != "Documentary" && type != "TV Series") {
				row = oThis.rows.shift();
				
				type = $("td.title_type", row).text();
			}
			
			var title = $("td.title > a", row).text();
			
			var rowDetails = {
				row: row,
				title: title,
				releaseYear: $("td.year", row).text()
			}

			handler.call(oThis.context, rowDetails);
		}, this.minRowPeriod);
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
			var imgUrl = chrome.extension.getURL("images/Netflix.png");
			$(rowDetails.row).find("td.availableAt")
			.append("<div><a target='_blank' href='" + webPageHref + "'><img title='View Netflix page in a new window' src='" +
					imgUrl + "'></img></a></div>");
		}
		
		rowDetails.this.searcher.readyForNext(nextRow);
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
    		rowDetails.this.searcher.readyForNext(nextRow);
    		return;
    	}
    	
    	var link = title.find("link[rel='http://schemas.netflix.com/catalog/titles/format_availability']");
    	var href = link.attr("href");
//    	console.info(title, link.length, link, href);
    	
    	rowDetails.titleXml = title;
    	
		if (href === undefined) {
    		rowDetails.this.searcher.readyForNext(nextRow);
			return;
		}
		
		rowDetails.this.invoker.invoke(href, [], rowDetails, "xml", formatCallback);
	}
	
	function nextRow(rowDetails) {
		rowDetails.this = this;
		
		var parameters = [];
	    parameters.push(["term", rowDetails.title]);
	    parameters.push(["start_index", "0"]);
	    parameters.push(["max_results", "3"]);
	    
	    this.invoker.invoke("http://api-public.netflix.com/catalog/titles", parameters, rowDetails, "xml", 
	    		titlesCallback);
	}
	
	this.searcher = new Searcher(this, rows, netflixAccessor, 
			250 // Netflix allows 10 calls per sec and it takes 2 per row
			);
	ProcessTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRow);
	this.invoker = new AvailableAt.Invoker(netflixAccessor);
}

////////////////////////////////////////////////////////////////////////////////

function Redbox() {
	
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
	ProcessTooltip.ourHeaderCell = $("th.availableAt", compactList);
	$("td.title", compactList).after("<td class='availableAt'></td>");
	
	var rows = $.makeArray($("tr.list_item"));
	if (rows.length > maxRows) {
		rows.splice(maxRows);
	}
	
	new Netflix(rows);
}
