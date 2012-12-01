# Title query

Target: https://api.redbox.com/v3/products
Parameters:
* apiKey=...
* q=(movie title)
* productTypes=Movies

# Query response samples

## Current movie

    {
        "Products": {
            "@lastUpdated": "2012-11-29T07:04:18",
            "Movie": [{
                "@format": "Blu-ray",
                "@isClosedCaptioned": "true",
                "@productId": "5A744633-7C36-473E-9E3C-B43A1520AC34",
                "@websiteUrl": "http:\/\/www.redbox.com\/movies\/jeff-who-lives-at-home-blu-ray?aid=api:all",
                "Title": "Jeff Who Lives at Home (BLU-RAY)",
                "SortTitle": "Jeff Who Lives at Home (BLU-RAY)",
                "UppercaseTitle": "JEFF WHO LIVES AT HOME (BLU-RAY)",
                "RedboxReleaseDate": "2012-06-19",
                "RedboxComingSoonDate": "NULL",
                "Flags": {
                    "Flag": [{
                        "@beginDate": "2012-05-22",
                        "@endDate": "2012-06-19",
                        "@type": "ComingSoon"
                    }, {
                        "@beginDate": "2012-06-19",
                        "@endDate": "2012-07-03",
                        "@type": "NewRelease"
                    }, {
                        "@beginDate": "2012-06-19",
                        "@type": "AvailableAtRedbox"
                    }, {
                        "@beginDate": "2012-06-19",
                        "@type": "SearchOnWeb"
                    }, {
                        "@beginDate": "2012-06-19",
                        "@type": "BrowseOnWeb"
                    }]
                },

## Old movie

	{
	    "Products": {
	        "@lastUpdated": "2012-11-29T07:19:18"
	    }
	}