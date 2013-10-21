var TvListings = {
	enabled: false,
	
	apiKey: roviTvListingApiKey,
	
	sig: function() {
		return md5(TvListings.apiKey+""+(new Date().getTime()));
	},
	
	serviceId: null,
	
	sourceIds: [],
};

function TvListingsQuery(rows, savedValues) {
	this.serviceId = savedValues["tv-provider"];
	this.sourceIds = $.map(savedValues["tv-sources"].split(","), function(val) {
		return Number(val);
	});
	this.showings = {};
	
	this.searcher = new Searcher(this, rows, null, 0, null);
	ProgressTooltip.addSearcher(this.searcher);

	
	console.log("Starting with", this);
	
	var us = this;
	
	$.getJSON("http://api.rovicorp.com/TVlistings/v9/listings/linearschedule/"+this.serviceId+"/info", 
		{
			duration: 240,
			sourceid: us.sourceIds.join(),
        	locale: "en-US",
        	apikey: TvListings.apiKey,
        	sig: TvListings.sig()
		})
	.done(function(data) {
		$.each(data.LinearScheduleResult.Schedule.Airings, function(i, airing) {
			if (airing.Category == "Movie") {
				if (us.showings[airing.Title] == undefined) {
					us.showings[airing.Title] = {
							channelName:	airing.CallLetters,
							channelNumber:	airing.Channel,
							iconAvailable:	airing.IconAvailable,
							parentNetworkId:	airing.ParentNetworkId
					};
				}
			}
		});
		
		dataReady();
	});
	
	function dataReady() {
		console.log("At dataReady", us);
		
		us.searcher.readyForNext(nextRow);
	}
	
	function nextRow(rowDetails) {
		console.log("Starting nextRow", rowDetails);
		if (rowDetails.type == "Feature") {
			var showing = this.showings[rowDetails.title];
			if (showing) {
				console.log("Adding badge");
				this.searcher.addFreeformBadge(rowDetails, "<div>"+showing.channelName+"("+showing.channelNumber+")</div>");
			}
		}
		
		this.searcher.readyForNext(nextRow);
	}
}

TvListingsQuery.prototype = {
		
};