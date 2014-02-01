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
