// Just for sanity
$("div#pagecontent").css("background-color", "green");

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

var rows;
var maxActiveQueries = 1;
var activeQueries = maxActiveQueries;
// Netflix allows 10 calls per sec and it takes 2 per row
var perRowTimeout = 200;

if (compactList.length > 0) {
	// Make room for our column
	$("th.num_votes").remove();
	$("td.num_votes").remove();
	$("th.created").remove();
	$("td.created").remove();
	
	$("th.title", compactList).after("<th class='availableAt'>At</th>");
	$("td.title", compactList).after("<td class='availableAt'></td>");
	
	var invoker = new AvailableAt.Invoker({ 
		consumerKey: "en66ns8syqhw7ukgsx3e94rx",
		consumerSecret: "gR4JE8NmXh" });
	
	var nowSec = Date.now() / 1000;

	rows = $.makeArray($("tr.list_item"));
	
	setTimeout(processNextRow, 1);
}

function processNextRow() {
	console.log("Checking for more", rows.length);
	if (rows.length > 0) {
		processListItem(rows.shift());
		return true;
	}
	else {
		console.log("Done");
		return false;
	}
}

function processListItem(row) {
	console.log("Prcessing row");
	// Only process feature films
	if ($("td.title_type", row).html() == "Feature") {
		$("td.title_type", row).css("color", "blue");
		
		var parameters = [];
	    parameters.push(["term", $("td.title > a", row).text()]);
	    parameters.push(["start_index", "0"]);
	    parameters.push(["max_results", "1"]);
	    
	    invoker.invoke("http://api-public.netflix.com/catalog/titles", parameters, row, "xml", function(data){
	    	console.log("titles:", data);
	    	var title = $(data).find("catalog_title").first();
	    	var link = title.find("link[rel='http://schemas.netflix.com/catalog/titles/format_availability']");
	    	var href = link.attr("href");
	    	console.log(title, link.length, link, href);
	    	
	    	var rowInfo = { row: this,
	    		title: title };
	    	
	    	invoker.invoke(href, [], rowInfo, "xml", function(formatData){
	    		console.log(formatData);
	    		
	    		var instantWatchInfo = $(formatData).find("availability:has(category[term='instant'])");
	    		
	    		if (instantWatchInfo.length > 0
	    				&& nowSec > instantWatchInfo.attr("available_from") 
	    				&& nowSec < instantWatchInfo.attr("available_until")) {
	    			var webPageHref = $(title).find("link[rel='alternate']").attr("href");
	    			var imgUrl = chrome.extension.getURL("images/Netflix.png");
	    			$(this.row).find("td.availableAt")
	    			.append("<div><a target='_blank' href='" + webPageHref + "'><img src='" +
	    					imgUrl + "'></img></a></div>");
	    		}
	    	});
	    });
	}
	
	setTimeout(processNextRow, perRowTimeout);
}