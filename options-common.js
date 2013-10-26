
var maxSearchLimit = 300;

var optionValues = {
	"service-netflix" : true,
	"service-redbox" : true,
	"service-hulu" : true,
	"service-tv" : false,
	"zip-code" : null,
	"search-radius" : 10,
	"search-limit": 200,
	"tv-sources": null,
	"tv-provider": null
};

// Setup and declare Parse

Parse.initialize(parseAccessor.appID, parseAccessor.jsKey);

var Action = Parse.Object.extend("Action");
var ServicesUsed = Parse.Object.extend("ServicesUsed");