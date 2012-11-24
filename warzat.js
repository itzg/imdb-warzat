
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

var compactList = $("div.list.compact");

var progressTooltip;
var ourHeaderCell;

var rows;
// Netflix allows 10 calls per sec and it takes 2 per row
var perRowTimeout = 250; // ms
var maxRows = 150;
var stopWarzat = false;

if (compactList.length > 0) {
	// Make room for our column
	$("th.num_votes").remove();
	$("td.num_votes").remove();
	$("th.created").remove();
	$("td.created").remove();
	
	$("th.title", compactList).after("<th class='availableAt'>Warzat?</th>");
	ourHeaderCell = $("th.availableAt", compactList);
	$("td.title", compactList).after("<td class='availableAt'></td>");
	
	var invoker = new AvailableAt.Invoker(netflixAccessor);
	
	var nowSec = Date.now() / 1000;

	rows = $.makeArray($("tr.list_item"));
	if (rows.length > maxRows) {
		rows.splice(maxRows);
	}
	
	setTimeout(processNextRow, 1);
}

function processNextRow() {
//	console.info("Checking for more", rows.length);
	if (!stopWarzat && rows.length > 0) {
		if (progressTooltip === undefined) {
			progressTooltip = $("<div id='warzatProgressPopup' class='ui-widget'>" +
					"<span id='warzatProgressCount'>.</span> left to process. <a href='#' id='btnStopWarzat'>Stop</a>" +
					"</div>").appendTo("body");
			progressTooltip.position({
				my: "left bottom",
				at: "left top-15",
				of: ourHeaderCell,
				collision: "none"
			});
			progressTooltip.show();
			
			$("#btnStopWarzat").click(function(evt){
				evt.preventDefault();
				stopWarzat = true;
			});
			
		}
		$("#warzatProgressCount").text(rows.length);
		
		processListItem(rows.shift());
		return true;
	}
	else {
		progressTooltip.hide();
		return false;
	}
}

function processListItem(row) {

	var type = $("td.title_type", row).text();
	
	if (type == "Feature" || type == "Documentary" || type == "TV Series") {
		
		var title = $("td.title > a", row).text();
		
		var rowDetails = {
			row: row,
			title: title,
			releaseYear: $("td.year", row).text()
		}
		
		var parameters = [];
	    parameters.push(["term", title]);
	    parameters.push(["start_index", "0"]);
	    parameters.push(["max_results", "3"]);
	    
	    invoker.invoke("http://api-public.netflix.com/catalog/titles", parameters, rowDetails, "xml", function(data){
	    	var rowDetails = this;
	    	
//	    	console.info(rowDetails.title, data);
	    	var title = null;
	    	$(data).find("catalog_title").each(function(candidate) {
	    		var candidateTitle = $("title", this).attr("short");
	    		var candidateYear = $("release_year", this).text();
	    		if (candidateTitle == rowDetails.title && candidateYear == rowDetails.releaseYear) {
	    			title = $(this);
	    			return false;
	    		}
	    	});
	    	
	    	if (title == null) {
//	    		console.log("No matching years for "+rowDetails.title);
	    		return;
	    	}
	    	
	    	var link = title.find("link[rel='http://schemas.netflix.com/catalog/titles/format_availability']");
	    	var href = link.attr("href");
//	    	console.info(title, link.length, link, href);
	    	
	    	lookupNetflixFormatAvailability(href, { 
    			row: rowDetails.row,
    			title: title 
	    	})
	    });
	}
	
	setTimeout(processNextRow, perRowTimeout);
}

function lookupNetflixFormatAvailability(href, rowInfo) {
	if (href === undefined) {
		return;
	}
	
	invoker.invoke(href, [], rowInfo, "xml", function(formatData){
//		console.info(formatData);
		
		var instantWatchInfo = $(formatData).find("availability:has(category[term='instant'])");
		
		if (instantWatchInfo.length > 0
				&& nowSec > instantWatchInfo.attr("available_from") 
				&& nowSec < instantWatchInfo.attr("available_until")) {
			var webPageHref = $(this.title).find("link[rel='alternate']").attr("href");
			var imgUrl = chrome.extension.getURL("images/Netflix.png");
			$(this.row).find("td.availableAt")
			.append("<div><a target='_blank' href='" + webPageHref + "'><img title='View Netflix page in a new window' src='" +
					imgUrl + "'></img></a></div>");
		}
	});

}