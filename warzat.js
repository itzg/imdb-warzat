
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
			
			var row;
            var info = {};

            while (info.type != "Feature" && info.type != "Documentary" && info.type != "TV Series") {
				row = oThis.rows.shift();
				
				if (row == undefined) {
					ProgressTooltip.update();
					return;
				}
                info = Warzat.extractInfo(row);
			}
			
			var rowDetails = {
				row: row,
				title: info.title,
				type: info.type,
				simpleType: Searcher.normalizeType(info.type),
				releaseYear: info.year
			};

			handler.call(oThis.context, rowDetails);
		}
		// Last call may have been slow, so we'll cap the minimum timeout at 10ms
		, Math.max(10, timeToWait));
	},
	
	addBadge: function(rowDetails, webPageHref) {
        var imgUrl = chrome.extension.getURL("images/"+this.badgeImage);
        var cell = Warzat.getAvailableAtCell(rowDetails.row);

        var badge = $("<div><a target='_blank' href='" + webPageHref + "'><img title='View product page in a new window' src='" +
            imgUrl + "'></img></a></div>")
            .appendTo(cell);

        var that = this;
        $("a", badge).click(function() {
            var action = new Action();
            action.set("what", "clicked-"+that.clickThruId);
            action.save();
        });

	},
	
	addFreeformBadge: function(rowDetails, content) {
        Warzat.getAvailableAtCell(rowDetails.row)
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
};

/*//////////////////////////////////////////////////////////////////////////////

AvailableAt instances basically encapsulate OAuth AJAX invocations. For now,
take a look at the existing uses to see how to use this :).

*/

var AvailableAt = {};

AvailableAt.Invoker = function(accessor) {
	$.extend(this, accessor);
};

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
};



/*//////////////////////////////////////////////////////////////////////////////

ProgressTooltip is used internally to display and track the search progress
to the user across all of the vendor APIs. It also exposes the options to
stop the searches and open options.

*/

var ProgressTooltip = {
	searchers: [],
	jqObj: null,
	ourHeaderCell: null,
    notice: null,
    noticeJqObj: null
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
					"<div class='popupFooter'><a id='warzatOptionsLink' href='#'>Options...</a></div>"+
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

            if (ProgressTooltip.notice != null) {
                ProgressTooltip.noticeJqObj = $("<div id='warzatNoticePopup' class='hintPopup'>" +
                    ProgressTooltip.notice +
                    "</div>")
                    .appendTo("body");
                ProgressTooltip.noticeJqObj.position({
                    my: "left top",
                    at: "right+15 top",
                    of: ProgressTooltip.jqObj,
                    collision: "none"
                });
                ProgressTooltip.noticeJqObj.show("fade");
            }
		
			$("#btnStopWarzat").click(function(evt){
				evt.preventDefault();
				ProgressTooltip.stopAll();
			});
		}
        else {
            ProgressTooltip.jqObj.show("fade");
            if (ProgressTooltip.noticeJqObj != null) {
                ProgressTooltip.noticeJqObj.show("fade");
            }
        }
		$("#warzatProgressCount").text(maxRemaining);
	}
	else if (ProgressTooltip.jqObj != null) {
		ProgressTooltip.jqObj.hide("puff");
        if (ProgressTooltip.noticeJqObj != null) {
            ProgressTooltip.noticeJqObj.hide("puff");
        }
    }
};

////////////////////////////////////////////////////////////////////////////////

var ClickHereHint = (function() {
    var STORAGE_KEY = "dismissedClickHereDlg";

    function dismissForever() {
        var items = {};
        items[STORAGE_KEY] = true;
        chrome.storage.sync.set(items);
    }

    function show() {
        var clicker = $("a.compact");
        if (clicker.size() == 0) {
            clicker = $("span.lister-mode.simple");
        }

        if (clicker.size() == 0) {
            console.warn("Unable to locate list mode selection button");
            return;
        }

        var hintPopup = $("<div class='hintPopup'>" +
            "<img id='clickHereArrow' src='" + chrome.extension.getURL("images/click-here.png") + "'/>" +
            "<div>Click here to see Warzat</div>" +
            "<div class='popupFooter'><a class='closeLink' href='#'>Got it, thanks</a></div>" +
            "</div>").appendTo("body");
        hintPopup.position({
            my: "center top+15",
            at: "center bottom",
            of: clicker
        });
        hintPopup.show("fade");

        clicker.hover(function () {
            hintPopup.hide();
        });

        $("a.closeLink", hintPopup).click(function (evt) {
            evt.preventDefault();
            hintPopup.hide();
            dismissForever();
        });
    }

    return {
        checkForNewUser: function () {
            try {
                chrome.storage.sync.get(STORAGE_KEY, function (items) {
                    if (!items[STORAGE_KEY]) {
                        try {
                            show();
                        } catch (e) {
                            console.warn("Trying to show click-here hint", e);
                        }
                    }
                });
            } catch (e) {
                console.warn("While accessing chrome storage", e);
            }
        }
    }
})();

////////////////////////////////////////////////////////////////////////////////

/*
IMPLEMENTATION NOTE:
Since we can't hook into a "done loading" type event, we have to resort
to polling the lists for new items. Luckily we can run around and "tag"
things we have already seen with our own "wz" class. That'll be used
to filter away the element selections in the code below.
 */
var WarzatListWatcher = (function() {
    var quietTime = 5000,
        timePerWatch = 500;

    var listerContainer = $(".lister.list");
    var listerList = $(".lister-list", listerContainer);
    var modeSimpleColumnHeaders = $(".mode-simple.column-headers");
    var watchTimeoutId = undefined;
    var lastActivity = 0;

    function handleWatchTimeout() {
        Warzat.trimExtraColumns();
        watchPagingControls();

        var unprocessed = $(".lister-item.mode-simple", listerList).not(".wz");
        if (unprocessed.length > 0) {
            // tag em so we don't pick them up next time
            unprocessed.addClass("wz");

            lastActivity = Date.now();
            Warzat.lookup(Warzat.applyRowLimit(unprocessed));
            watchTimeoutId = setTimeout(handleWatchTimeout, timePerWatch);
        }
        else if ((Date.now() - lastActivity) > quietTime) {
            watchTimeoutId = undefined;
        }
        else {
            watchTimeoutId = setTimeout(handleWatchTimeout, timePerWatch);
        }
    }

    function watchPagingControls() {
        var pagingControls = $("a.lister-page-prev")
            .add("a.lister-page-next")
            .add("span.lister-mode.simple")
            .not(".wz");

        pagingControls.click(function () {
            if (watchTimeoutId == undefined) {
                lastActivity = Date.now();
                console.debug("Starting activity timer");
                watchTimeoutId = setTimeout(handleWatchTimeout, timePerWatch);
            }
        });

        pagingControls.addClass("wz");
    }

    return {
        getColumnHeaders: function() {
            return modeSimpleColumnHeaders;
        },

        isSimpleMode: function() {
            return !modeSimpleColumnHeaders.hasClass("hidden");
        },

        start: function () {
            handleWatchTimeout();
            watchPagingControls();
        }
    };
})();

////////////////////////////////////////////////////////////////////////////////
// MAIN

var Warzat = (function() {
    var newMode = false;
    var compactList = $("div.list_titles div.list.compact");
    if (compactList.length == 0) {
        compactList = $("div.lister.detail");
        newMode = compactList.length > 0;
    }
    
    var savedOptions;

    function setupNewHeader() {
        var titleHeader = $(".column-headers .col-title", compactList);
        ProgressTooltip.ourHeaderCell = titleHeader;

        titleHeader.find("strong").text(function(i, oldText) {
            return oldText + " & Warzat?";
        });

    }

    function setupOldHeader() {
        // Make room for our column
        $("th.num_votes").remove();
        $("td.num_votes").remove();
        $("th.created").remove();
        $("td.created").remove();

        $("th.title", Warzat.compactList).after("<th class='availableAt'>Warzat?</th>");
        ProgressTooltip.ourHeaderCell = $("th.availableAt", Warzat.compactList);
        $("td.title", Warzat.compactList).after("<td class='availableAt' style='text-align: left'></td>");
    }

    return {
        compactList: compactList,

        isListView: function() {
            return compactList.length != 0;
        },

        setupHeader: function() {
            if (newMode) {
                setupNewHeader();
            }
            else {
                setupOldHeader();
            }
        },

        trimExtraColumns: function () {
            var userRatingSel = $(".col-user-rating", compactList);
            userRatingSel.remove();

            var onesToWiden = $(".col-title", compactList).not(".wz");
            onesToWiden.width(function (i, oldWidth) {
                return oldWidth + 70;
            });
            onesToWiden.addClass("wz");
        },

        extractRows: function (maxRows) {
            var rows;

            if (newMode) {
                rows = $.makeArray(compactList.find(".lister-list .lister-item.mode-simple"));
            }
            else {
                rows = $.makeArray($("tr.list_item"));
                // Remove header row.
                rows.shift();
            }

            if (rows.length > maxRows) {
                rows.splice(maxRows);
            }

            return rows;
        },

        applyRowLimit: function(rowSel) {
            return $.makeArray(rowSel.filter(function(i) {
                return i < maxRows;
            }));
        },

        extractInfo: function(row) {
            // Possible values for type:
            // Feature
            // Documentary
            // TV Series
            // Video Game
            var info = {
                title: null,
                year: null,
                type: null
            };

            if (newMode) {
                info.title = $(".col-title a", row).text();

                // Possible formats for year block
                // (I) (2011)
                // (2011)
                // (2004–2010)
                // (2013 TV Mini-Series)
                // (2003 TV Movie)
                // (2013 Video Game)
                var yearBlob = $("span.lister-item-year", row).text();
                yearBlob.replace("(I) ", "");
                if (yearBlob.charAt(0) == '(' && yearBlob.charAt(yearBlob.length-1) == ')') {
                    yearBlob = yearBlob.substr(1,yearBlob.length-2);

                    var dashPos = yearBlob.search("-");
                    if (dashPos >= 0) {
                        info.type = "TV Series";
                        info.year = yearBlob.substr(0, dashPos);
                    }
                    else {
                        if (yearBlob.search(/\d+ Video Game/) >= 0) {
                            info.type = "Video Game";
                        }
                        else {
                            info.type = "Feature";
                        }
                        info.year = yearBlob.match(/\d+/)[0];
                    }
                }
                else {
                    console.debug("yearBlob didn't look right", yearBlob, row);
                }
            }
            else {
                info.type = $("td.title_type", row).text().trim();
                info.title = $("td.title > a", row).text();
                info.year = $("td.year", row).text();
            }

            return info;
        },

        getAvailableAtCell: function(row) {
            if (newMode) {
                var cell = $(".col-title div.availableAt", row);
                if (cell.length == 0) {
                    cell = $("<div style='display: inline-block' class='availableAt' />")
                        .appendTo($(".col-title", row));
                }
                return cell;
            }
            else {
                return $("td.availableAt", row);
            }
        },

        start: function(savedOptionsIn) {
            savedOptions = savedOptionsIn;
            if (savedOptions["search-limit"] != undefined) {
                maxRows = savedOptions["search-limit"];
            }
            else {
                maxRows = 100;
            }

            if (newMode) {
                WarzatListWatcher.start();
            }
            else {
                // Slice off header row.
                var trSel = $("tr.list_item").slice(1);
                Warzat.lookup(Warzat.applyRowLimit(trSel));
            }
        },

        lookup: function(rowsArray) {
            console.debug("Starting lookup", rowsArray.length);
            if (savedOptions["service-netflix"]) {
                ProgressTooltip.notice = "Netflix will be retiring their public API on <b>Nov 14, 2014</b>." +
                    "Warzat will no longer be able check availability on Netflix after that date :(";
                new Netflix(rowsArray);
            }
            savedOptions["service-redbox"] && new Redbox(rowsArray, savedOptions);
            savedOptions["service-hulu"] && new Hulu(rowsArray);
            savedOptions["service-tv"] && new TvListingsQuery(rowsArray, savedOptions);
            //noinspection JSPotentiallyInvalidConstructorUsage
            savedOptions["service-itunes"] && new iTunes(rowsArray);
        }

};
})();

var maxRows = optionValues["search-limit"];

var action = new Action();
if (Warzat.isListView()) {
	action.set("what", "used-compactList");
	action.save();

    Warzat.setupHeader();

	chrome.storage.sync.get(optionValues, function(savedValues) {
		Warzat.start(savedValues);
	});
	
}
else {
	action.set("what", "used-other-viewType");
	action.save();

    ClickHereHint.checkForNewUser();
}
