
function iTunes(rows) {
	
	function itunesSearchHandler(data) {
		console.debug("Got "+data.resultCount+" results back from iTunes for ", this);
		if (data.resultCount > 0) {
			if (this.simpleType == "movie") {
				this.me.searcher.addBadge(this, data.results[0].trackViewUrl);
			}
			else if (this.simpleType == "tv") {
				this.me.searcher.addBadge(this, data.results[0].collectionViewUrl);
			}
		}
		this.me.searcher.readyForNext(nextRow);
	}
	
	function errorCallback(jqXHR, textStatus, errorThrown) {
		console.error("iTunes query failed", this, textStatus, errorThrown);
		this.me.searcher.readyForNext(nextRow);
	}
	
	function nextRow(rowDetails) {
		rowDetails.me = this;
		
		var reqData = null;
		
		// Tweak the request based on the type of media
		if (rowDetails.simpleType == "movie") {
			reqData = {
					term: rowDetails.title,
					media: "movie",
					attribute: "movieTerm",
					limit: 1
			};
		}
		else if (rowDetails.simpleType == "tv") {
			reqData = {
					term: rowDetails.title,
					media: "tvShow",
					attribute: "showTerm",
					entity: "tvSeason",
					limit: 1
			};
		}
		
		if (reqData) {
			$.ajax({
				  dataType: "json",
				  url: "https://itunes.apple.com/search",
				  data: reqData,
				  success: itunesSearchHandler,
				  context: rowDetails
				})
			.fail(errorCallback);
		}
		else {
			console.debug("Unknown media type: ", rowDetails);
			this.search.readyForNext(nextRow);
		}
	}
	
	this.searcher = new Searcher(this, rows, null, 100, "iTunes.png", "itunes", "iTunes");
	ProgressTooltip.addSearcher(this.searcher);
	this.searcher.readyForNext(nextRow);
}
