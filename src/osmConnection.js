/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2015 Marcus Lundblad
 *
 * GNOME Maps is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * GNOME Maps is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with GNOME Maps; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Marcus Lundblad <ml@update.uu.se>
 */

const OSMNode = imports.osmNode;
const OSMRelation = imports.osmRelation;
const OSMWay = imports.osmWay;

const Lang = imports.lang;
const Maps = imports.gi.GnomeMaps;
const Soup = imports.gi.Soup;

const BASE_URL = 'https://api.openstreetmap.org/api';
const API_VERSION = '0.6';

const OSMConnection = new Lang.Class({
    Name: 'OSMConnection',

    _init: function(params) {
	this._session = new Soup.Session();
	Maps.osm_init();
    },

    getOSMObject: function(type, id, callback) {
	let url = this._getQueryUrl(type, id);
	let uri = new Soup.URI(url);
	let request = new Soup.Message({ method: 'GET',
					 uri: uri });

	this._session.queue_message(request, (function(obj, message) {
	    if (message.status_code !== Soup.KnownStatusCode.OK) {
                callback(false, message.status_code, null);
                return;
            }

	    let json = this._parseXML(type, message.response_body);
	    let object = null;

	    if (json != null)
		object = this._createObject(type, json);
	    
	    if (object == null)
		callback(false, message.status_code, null);
	    else
		callback(true,
			 message.status_code,
			 object);
        }).bind(this));
    },
    
    _getQueryUrl: function(type, id) {
	return BASE_URL + '/' + API_VERSION + '/' + type + '/' + id;
    },

    _parseXML: function(type, body) {
	let jsonString;
	
	switch (type) {
	case 'node':
	    jsonString = Maps.osm_parse_node(body.data, body.length);
	    break;
	case 'way':
	    jsonString = Maps.osm_parse_way(body.data, body.length);
	default:
	}

	print ('parsed XML to JSON: ' + jsonString);
	
	return JSON.parse(jsonString);
    },

    _createObject: function(type, json) {
	switch (type) {
	case 'node':
	    return new OSMNode.OSMNode(json);
	case 'way':
	    return new OSMWay.OSMWay(json);
	case 'relation':
	    return new OSMRelation.OSMRelation(json);
	default:
	    return null;
	}
    }
})

