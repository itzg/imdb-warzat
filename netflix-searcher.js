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
