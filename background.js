chrome.runtime.onMessage
.addListener(function(request, sender, sendResponse) {
	if (request.action == 'show' && request.target == 'options') {
		chrome.windows.create({
			url: 'options.html',
			tabId: sender.tab.id,
			width: 990,
			height: 760,
			focused: true,
			type: 'popup'
		});
	}
});