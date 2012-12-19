# Hulu API

Unofficial RESTful API found [here](https://github.com/adammagana/hulu-php-library).

## An Example

Searching for "Lost"

	Request Url: http://m.hulu.com/search
	Request Method: GET
	Status Code: 200
	Params: {
	    "dp_identifier": "Hulu",
	    "query": "Lost",
	    "items_per_page": "1",
	    "page": "1"
	}

responded with


	<?xml version="1.0" encoding="UTF-8"?>
	<results>

	<!-- ommitted some extra stuff -->

	    <videos type="array">
	        <video>
	<!-- ommitted some additional episode specific elements -->
	            <allow-international type="boolean">false</allow-international>
	            <allow-progressive-download type="boolean" />
	            <alternate-video-id type="integer" />
	            <alternate-video-type />
	            <aspect-ratio>16x9</aspect-ratio>
	            <backup-pid />
	            <categories>Episodes</categories>
	            <channel>ABC</channel>
	            <channels>Drama|Science Fiction~Science Fiction - Thriller</channels>
	            <collation-title>end</collation-title>
	            <company-id type="integer">231</company-id>
	            <content-id>50058465</content-id>
	            <content-rating>TV-14</content-rating>
	            <content-rating-reason>V,L</content-rating-reason>
	            <copyright>ABC Studios</copyright>
	            <cp-identifier>ABC</cp-identifier>
	            <daypart>Prime Time</daypart>
	            <default-region>US</default-region>
	            <default-text-language>en</default-text-language>
	            <has-captions type="boolean">true</has-captions>
	            <has-hd type="boolean">true</has-hd>
	            <has-mobile type="boolean">false</has-mobile>
	            <has-plus-living-room type="boolean">true</has-plus-living-room>
	            <has-plus-mobile type="boolean">true</has-plus-mobile>
	            <has-plus-preview type="boolean">true</has-plus-preview>
	            <has-plus-web type="boolean">true</has-plus-web>
	            <plus-first-available-at type="datetime">2010-09-03T17:00:00Z</plus-first-available-at>
	            <plus-last-processed-subscriptions-at type="datetime" />
	            <plus-living-room-available-at type="datetime" />
	            <plus-living-room-expires-at type="datetime" />
	            <plus-mobile-available-at type="datetime" />
	            <plus-mobile-expires-at type="datetime" />
	            <plus-web-available-at type="datetime" />
	            <plus-web-expires-at type="datetime" />
	            <title>The End</title>
	            <available-at type="datetime">1970-01-01T00:00:00Z</available-at>
	            <expires-at type="datetime">1970-01-02T00:00:00Z</expires-at>
	            <classic-available-at type="datetime">2010-09-03T17:00:00Z</classic-available-at>
	            <classic-expires-at type="datetime">2010-09-20T09:00:00Z</classic-expires-at>
	            <valid-available-at type="datetime">1970-01-01T00:00:00Z</valid-available-at>
	            <valid-expires-at type="datetime">1970-01-02T00:00:00Z</valid-expires-at>

	<!-- The show as a whole, which is probably what we want -->
	            <show>
	                <audit-url />
	                <availability-image />
	                <canonical-name>lost</canonical-name>
	                <category-order />
	                <clips-count type="integer">0</clips-count>
	                <collation-name>lost</collation-name>
	                <collation-title>lost</collation-title>
	                <company-id type="integer">231</company-id>
	                <content-age-group>Library</content-age-group>
	                <default-region>US</default-region>
	                <default-text-language>en</default-text-language>
	                <description>ABC's LOST explores the destiny of the passengers of Oceanic Flight 815 who crashed on an island. The survivors not only have to rely on each other, but also cope with the secrets the mysterious island holds. Some become friends, others enemies and some stories remain to be told. There's much more than meets the eye, as it becomes apparent that everyone is somehow connected and that everyone has a purpose.</description>
	                <embed-permitted type="boolean">true</embed-permitted>
	                <end-date type="datetime">2010-05-28T00:00:00Z</end-date>
	                <episodes-count type="integer">0</episodes-count>
	                <feature-films-count type="integer">0</feature-films-count>
	                <forced-popularity type="integer">0</forced-popularity>
	                <genre>Drama</genre>
	                <genres>Drama|Science Fiction~Science Fiction - Thriller</genres>
	                <has-hd type="boolean">true</has-hd>
	                <has-plus-living-room type="boolean">true</has-plus-living-room>
	                <has-plus-mobile type="boolean">true</has-plus-mobile>
	                <has-plus-web type="boolean">true</has-plus-web>
	                <hulu-premiere-date type="datetime" />
	                <id type="integer">2400</id>
	                <is-browseable type="boolean">true</is-browseable>
	                <is-movie type="boolean">false</is-movie>
	                <last-modified type="timestamp">Tue Dec 18 20:40:41 UTC 2012</last-modified>
	                <link-description>For more information visit the official <a href="http://abc.go.com/primetime/lost/" target="_blank">Lost website</a></link-description>
	                <link-url>http://assets.hulu.com/networklogos/abc-preroll-480k.flv</link-url>
	                <name>Lost</name>
	                <original-premiere-date type="datetime">2004-09-22T00:00:00Z</original-premiere-date>
	                <plus-company-id type="integer" />
	                <plus-web-seasons-count type="integer">6</plus-web-seasons-count>
	                <plus-web-videos-count type="integer">138</plus-web-videos-count>
	                <positive-votes-count type="integer">293768</positive-votes-count>
	                <released-at type="datetime">2009-08-28T09:24:04Z</released-at>
	                <reviews-count type="integer">143</reviews-count>
	                <seasons-count type="integer">0</seasons-count>
	                <series-id type="integer">12069</series-id>
	                <tms-series-id>SH006723620000</tms-series-id>
	                <videos-count type="integer">0</videos-count>
	                <votes-count type="integer">74312</votes-count>
	                <user-star-rating type="float">4.28423407584223</user-star-rating>
	                <is-subscriber-only type="boolean">true</is-subscriber-only>
	                <games-count type="integer">0</games-count>
	                <film-clips-count type="integer">0</film-clips-count>
	                <channels />
	                <channels-with-plus>Drama|Science Fiction~Science Fiction - Thriller</channels-with-plus>
	                <art-copyright />
	            </show>
	            <company>
	                <background-color />
	                <channel-id type="integer">282</channel-id>
	                <collation-name>ABC</collation-name>
	                <default-region>US</default-region>
	                <default-text-language>en</default-text-language>
	                <description />
	                <id type="integer">231</id>
	                <key-art />
	                <key-art-background />
	                <last-modified type="timestamp">Mon Oct 15 02:45:15 UTC 2012</last-modified>
	                <link-url />
	                <name>ABC</name>
	                <short-name>ABC</short-name>
	                <text-color />
	                <website-url />
	                <display-name>ABC</display-name>
	                <short-display-name>ABC</short-display-name>
	                <uber-company-id type="integer">231</uber-company-id>
	            </company>
	        </video>
	    </videos>
	    <show-name-set type="array" />
	    <st type="integer">0</st>
	    <result-set-id type="integer">-1</result-set-id>
	    <missed-show-set type="array" />
	    <suggestions nil="true" />
	</results>

Under the path: `results/videos/video[0]/show/`

* `name` is the actual show name
* `has-plus-living-room` with a value of `true` is probably the indicator we want
* There are some other elements that start with `has-plus-` or `plus-` that might be useful