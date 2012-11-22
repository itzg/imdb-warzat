$("div#pagecontent").css("background-color", "green");

var compactList = $("div.list.compact");

if (compactList.length > 0) {
	// Make room for our column
	$("th.num_votes").remove();
	$("td.num_votes").remove();
	$("th.created").remove();
	$("td.created").remove();
	
	$("th.title", compactList).after("<th class='availableAt'>At</th>");
	$("td.title", compactList).after("<td class='availableAt'>?</td>");
	
	$("tr.list_item").each(function(index) {
		// Only process feature films
		if ($("td.title_type", this).html() == "Feature") {
			$("td.title_type", this).css("color", "blue");
			
			// FOR DEVELOPMENT, only process one specific title
			if ($("td.title > a", this).html() == "The Dark Knight Rises") {
				$("td.title > a", this).css("color", "red");
				
				
			}
		}
	});
}