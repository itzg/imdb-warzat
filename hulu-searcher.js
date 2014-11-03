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
            var urlName = videoXml.find("show > canonical-name");
            if (urlName.length > 0) {
                var url = "http://www.hulu.com/" + urlName.text();
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
