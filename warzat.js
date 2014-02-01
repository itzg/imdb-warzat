
/*///////////////////////////////////////////////////////////////////////////////

It is recommended that vendor specific searchers actually delegate via an
instance of Searcher. Typically this is done by constructing and saving to the 'searcher' field:

function MySearcher(rows) {

	// ... More AJAX handlers probably end up here

	// Example of a typical error callback to provide to AJAX calls
	function errorCallback(jqXHR, textStatus, errorThrown) {
		console.error("Query failed", this, textStatus, errorThrown);
		// just keep swimming
		this.me.searcher.readyForNext(nextRow);
	}
	
	// Example of your readyForNext handler
	function nextRow(rowDetails) {
		// Save off our reference since you'll want to pass rowDetails into the AJAX call's context
		rowDetails.me = this;
		
		// Do some kind of AJAX'y call propagating to yet another handler
		// DON'T FORGET to add the vendor's API base URL to the permissions in the manifest.json.
		
		// on error...must keep things progressing
		this.searcher.readyForNext(nextRow);
	}

	// Examples values
	var minRowPeriod = 250;
	var badgeImage = "vendor.png";
	var clickThruId = "vendor";
	
	this.searcher = new Searcher(this, rows, accessor, minRowPeriod, badgeImage, clickThruId);
	ProgressTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRow);
}
	
Notice you MUST register the Searcher with the progress tracker.


The Searcher constructor consists of
 	context: 		becomes the 'this' of handler given to readyForNext, so typically
 					you'll want to pass the instance of your specific searcher object
 	rows:			the common list of rows provided to each searcher 
 	accessor:		a vendor API specific accessor object, can be null
 	minRowPeriod:	some APIs impose request-rate limits, so this specifies the minimum
 	 				amount of time (in milliseconds) between each request. If a request
 	 				takes longer than this, then there is no additional delay
	badgeImage:		the name of the image file under 'images' to apply as the badge 
	clickThruId:	the ID (that should ideally match the options-commons.js identifier) 
					that is used when saving click-thru metrics

To kick off the processing, the "searcher instance"
constructor should invoke 

	readyForNext(handler(rowDetails))

where the this-context of the handler is 'context' passed in the Searcher constructor
and the rowDetails object passed to the handler consists of:
	row: 			the row element itself
	title: 			the movie/show title
	type: 			type of media as reported by IMDB in the "Type" column,
	       			such as "Feature", "TV Series", "Documentary"
	simpleType:		normalized media type that is either "movie" or "tv"
	releaseYear: 	the four digit release year of the movie/show instance

NOTE: it is the searcher's responsibility to keep the loop going by re-invoking
readyForNext, success or failure.

 
The searcher's handler pipeline can indicate availability and provide the vendor site URL by
invoking

	addBadge(rowDetails, webPageHref)
	
where
	rowDetails:		the rowDetails object provided to the readyForNext handler
	webPageHref		the URL of the web page to reference


*/

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

Searcher.normalizeType = function(imdbType) {
	if (imdbType == "Feature" || imdbType == "Documentary") {
		return "movie";
	}
	else if (imdbType == "TV Series") {
		return "tv";
	}
	else {
		return null;
	}
};

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
				simpleType: Searcher.normalizeType(type),
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

/*//////////////////////////////////////////////////////////////////////////////

AvailableAt instances basically encapsulate OAuth AJAX invocations. For now,
take a look at the existing uses to see how to use this :).

*/

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



/*//////////////////////////////////////////////////////////////////////////////

ProgressTooltip is used internally to display and track the search progress
to the user across all of the vendor APIs. It also exposes the options to
stop the searches and open options.

*/

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
		savedValues["service-itunes"] && new iTunes(rows);
	});
	
}
else {
	var action = new Action();
	action.set("what", "used-other-viewType");
	action.save();
}
