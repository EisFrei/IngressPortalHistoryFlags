// ==UserScript==
// @id portalHistoryFlags
// @name IITC Plugin: Portal History Flags
// @category Layer
// @version 0.0.2
// @namespace	https://github.com/EisFrei/IngressPortalHistoryFlags
// @downloadURL	https://github.com/EisFrei/IngressPortalHistoryFlags/raw/master/portalHistoryFlags.user.js
// @homepageURL	https://github.com/EisFrei/IngressPortalHistoryFlags
// @description Shows Visited/Captured/Scouted status above portal markers
// @author EisFrei
// @include		https://intel.ingress.com/*
// @match		https://intel.ingress.com/*
// @grant			none
// ==/UserScript==

function wrapper(plugin_info) {

	// Make sure that window.plugin exists. IITC defines it as a no-op function,
	// and other plugins assume the same.
	if (typeof window.plugin !== "function") window.plugin = function () {};

	const KEY_SETTINGS = "plugin-portal-history-flags";

	window.plugin.PortalHistoryFlags = function () {};

	const thisPlugin = window.plugin.PortalHistoryFlags;
	// Name of the IITC build for first-party plugins
	plugin_info.buildName = "PortalHistoryFlags";

	// Datetime-derived version of the plugin
	plugin_info.dateTimeVersion = "202102052258";

	// ID/name of the plugin
	plugin_info.pluginId = "portalhistoryflags";


	function svgToIcon(str, x) {
		const url = ("data:image/svg+xml," + encodeURIComponent(str)).replace(/#/g, '%23');
		return new L.Icon({
			iconUrl: url,
			iconSize: [10, 10],
			iconAnchor: [x, 20],
		})
	}

	thisPlugin.removePortalFromMap = function (data) {
		if (!data.portal._historyLayer) {
			return;
		}
		thisPlugin.layerGroup.removeLayer(data.portal._historyLayer);
	}

	thisPlugin.addToPortalMap = function (data) {
		if (data.portal.options.ent.length === 3 && data.portal.options.ent[2].length >= 19 && data.portal.options.ent[2][18] > 0) {
			data.portal.options.data.agentVisited = (data.portal.options.ent[2][18] & 0b1) === 1;
			data.portal.options.data.agentCaptured = (data.portal.options.ent[2][18] & 0b10) === 2;
			data.portal.options.data.agentScouted = (data.portal.options.ent[2][18] & 0b100) === 4;
		}
		var tileParams = window.getCurrentZoomTileParameters();
		if (tileParams.level === 0) {
			drawPortalFlags(data.portal);
		} else {
			thisPlugin.removePortalFromMap(data);
		}
	}

	thisPlugin.toggleDisplayMode = function () {
		thisPlugin.settings.drawMissing = !thisPlugin.settings.drawMissing;
		localStorage[KEY_SETTINGS] = JSON.stringify(thisPlugin.settings);
		drawAllFlags();
	}

	function drawPortalFlags(portal) {
		/*if (portal._historyLayer) {
		    portal._historyLayer.addTo(thisPlugin.layerGroup);
		    return;
		}*/

		const drawMissing = thisPlugin.settings.drawMissing;
		portal._historyLayer = new L.LayerGroup();
		if (drawMissing && !portal.options.data.agentVisited || !drawMissing && portal.options.data.agentVisited) {
			L.marker(portal._latlng, {
				icon: thisPlugin.iconVisited,
				interactive: false,
				keyboard: false,
			}).addTo(portal._historyLayer);
		}
		if (drawMissing && !portal.options.data.agentCaptured || !drawMissing && portal.options.data.agentCaptured) {
			L.marker(portal._latlng, {
				icon: thisPlugin.iconCaptured,
				interactive: false,
				keyboard: false,
			}).addTo(portal._historyLayer);
		}
		if (drawMissing && !portal.options.data.agentScouted || !drawMissing && portal.options.data.agentScouted) {
			L.marker(portal._latlng, {
				icon: thisPlugin.iconScouted,
				interactive: false,
				keyboard: false,
			}).addTo(portal._historyLayer);
		}
		portal._historyLayer.addTo(thisPlugin.layerGroup);
	}

	function drawAllFlags() {
		thisPlugin.layerGroup.clearLayers();
		for (let id in window.portals) {
			drawPortalFlags(window.portals[id]);
		}
	}

	function setup() {
		try {
			thisPlugin.settings = JSON.parse(localStorage[KEY_SETTINGS]);
		} catch (e) {
			thisPlugin.settings = {
				drawMissing: false,
			};
		}

		thisPlugin.iconVisited = svgToIcon('<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle fill="#9538ff" cx="50" cy="50" r="50"/></svg>', 15);
		thisPlugin.iconCaptured = svgToIcon('<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle fill="#ff0000" cx="50" cy="50" r="50"/></svg>', 5);
		thisPlugin.iconScouted = svgToIcon('<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle fill="#ff9c00" cx="50" cy="50" r="50"/></svg>', -5);

		thisPlugin.layerGroup = new L.LayerGroup();
		window.addLayerGroup('Portal History', thisPlugin.layerGroup, false);

		window.addHook('portalAdded', thisPlugin.addToPortalMap);
		window.addHook('portalRemoved', thisPlugin.removePortalFromMap);
		$('#toolbox').append('<a onclick="window.plugin.PortalHistoryFlags.toggleDisplayMode()">History mode</a>');
	}
	setup.info = plugin_info; //add the script info data to the function as a property
	// if IITC has already booted, immediately run the 'setup' function
	if (window.iitcLoaded) {
		setup();
	} else {
		if (!window.bootPlugins) {
			window.bootPlugins = [];
		}
		window.bootPlugins.push(setup);
	}
}



(function () {
	const plugin_info = {};
	if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
		plugin_info.script = {
			version: GM_info.script.version,
			name: GM_info.script.name,
			description: GM_info.script.description
		};
	}
	// Greasemonkey. It will be quite hard to debug
	if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
		// inject code into site context
		const script = document.createElement('script');
		script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
		(document.body || document.head || document.documentElement).appendChild(script);
	} else {
		// Tampermonkey, run code directly
		wrapper(plugin_info);
	}
})();
