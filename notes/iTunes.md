# iTunes Search API

http://www.apple.com/itunes/affiliates/resources/documentation/itunes-store-web-service-search-api.html#searching

## Request Movie Example

    Request Url: https://itunes.apple.com/search
    Request Method: GET
    Status Code: 200
    Params: {
        "term": "The Way Way Back",
        "media": "movie",
        "attribute": "movieTerm",
        "limit": "1"
    }

## Response Movie Example

    {
      "resultCount": 1,
      "results": [
        {
          "wrapperType": "track",
          "kind": "feature-movie",
          "trackId": 711391397,
          "artistName": "Nat Faxon & Jim Rash",
          "trackName": "The Way, Way Back",
          "trackCensoredName": "The Way, Way Back",
          "trackViewUrl": "https://itunes.apple.com/us/movie/the-way-way-back/id711391397?uo=4",
          "previewUrl": "http://a1464.v.phobos.apple.com/us/r1000/049/Video4/v4/44/14/21/441421d2-a5c4-e82a-952f-d07b39a9c104/mzvf_6788198408255918212.640x458.h264lc.D2.p.m4v",
          "artworkUrl30": "http://a2.mzstatic.com/us/r30/Video4/v4/d8/1f/cf/d81fcf20-ec10-a88e-b80b-600c30b4a14d/mza_7784476818332886250.30x30-50.jpg",
          "artworkUrl60": "http://a1.mzstatic.com/us/r30/Video4/v4/d8/1f/cf/d81fcf20-ec10-a88e-b80b-600c30b4a14d/mza_7784476818332886250.60x60-50.jpg",
          "artworkUrl100": "http://a3.mzstatic.com/us/r30/Video4/v4/d8/1f/cf/d81fcf20-ec10-a88e-b80b-600c30b4a14d/mza_7784476818332886250.100x100-75.jpg",
          "collectionPrice": 12.99,
          "trackPrice": 12.99,
          "releaseDate": "2013-07-05T07:00:00Z",
          "collectionExplicitness": "notExplicit",
          "trackExplicitness": "notExplicit",
          "trackTimeMillis": 6266850,
          "country": "USA",
          "currency": "USD",
          "primaryGenreName": "Comedy",
          "contentAdvisoryRating": "PG-13",
          "shortDescription": "Dive into this hilarious comedy from the studio that brought you Little Miss Sunshine and Juno!",
          "longDescription": "Dive into this hilarious comedy from the studio that brought you Little Miss Sunshine and Juno! While 14-year-old Duncan (Liam James) is being dragged on a family trip with his mom (Toni Collette) and her overbearing boyfriend (Steve Carell), he befriends the gregarious manager (Sam Rockwell) of a local water park. The two form a powerful bond, resulting in a vacation Duncan will never forget!",
          "radioStationUrl": "https://itunes.apple.com/us/station/idra.711391397"
        }
      ]
    }
    
    
## Request TV Show Example

    Request Url: https://itunes.apple.com/search
    Request Method: GET
    Status Code: 200
    Params: {
        "term": "Lost",
        "media": "tvShow",
        "attribute": "showTerm",
        "limit": "1",
        "entity": "tvSeason"
    }
    
## Response TV Show Example

    {
      "resultCount": 1,
      "results": [
        {
          "wrapperType": "collection",
          "collectionType": "TV Season",
          "artistId": 66012553,
          "collectionId": 82050675,
          "artistName": "LOST",
          "collectionName": "LOST, Season 2",
          "collectionCensoredName": "LOST, Season 2",
          "artistViewUrl": "https://itunes.apple.com/us/tv-show/lost/id66012553?uo=4",
          "collectionViewUrl": "https://itunes.apple.com/us/tv-season/lost-season-2/id82050675?uo=4",
          "artworkUrl60": "http://a4.mzstatic.com/us/r30/Features/0c/1a/a2/dj.annmovip.60x60-50.jpg",
          "artworkUrl100": "http://a4.mzstatic.com/us/r30/Features/0c/1a/a2/dj.annmovip.100x100-75.jpg",
          "collectionPrice": 24.99,
          "collectionExplicitness": "notExplicit",
          "contentAdvisoryRating": "TV-14",
          "trackCount": 24,
          "copyright": "© ABC Studios. All Rights Reserved.",
          "country": "USA",
          "currency": "USD",
          "releaseDate": "2005-10-12T07:00:00Z",
          "primaryGenreName": "Drama",
          "longDescription": "<i>LOST</i> returns for a second season of action-packed mystery and adventure that continues to bring out the very best and the very worst in the group of stranded Oceanic Air passengers.  Descending into the mysterious hatch will divide loyalties as it raises new questions about the island. The appearance of survivors from the plane's tail section reunites loved ones and brings new violence to the fragile society. Finally, a series of secrets, lies and betrayals will force some to cross the line in unimaginable ways."
        }
      ]
    }   
 
## Conclusions

For Movies
* media=movie, attribute=movieTerm
* from results, check resultCount, use results[0].trackViewUrl as the link

For TV Shows
* The results[0].artistViewUrl seems to be better since it is the whole show's collection view