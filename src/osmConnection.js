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

const OSMChangeset = imports.osmChangeset;
const OSMNode = imports.osmNode;
const OSMRelation = imports.osmRelation;
const OSMWay = imports.osmWay;

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Maps = imports.gi.GnomeMaps;
const Soup = imports.gi.Soup;

const BASE_URL = 'https://api.openstreetmap.org/api';
const TEST_BASE_URL = 'http://api06.dev.openstreetmap.org/api';
const API_VERSION = '0.6';

const OSMConnection = new Lang.Class({
    Name: 'OSMConnection',

    _init: function(params) {
	this._session = new Soup.Session();

	// TODO: stopgap to supply username/password
	// to use with HTTP basic auth, should be
	// replaced with OATH and real settings or GOA account
	this._username = GLib.getenv('OSM_USERNAME');
	this._password = GLib.getenv('OSM_PASSWORD');

	this._session.connect('authenticate', this._authenticate.bind(this));
	
	Maps.osm_init();
    },

    getOSMObject: function(type, id, callback, cancellable) {
	let url = this._getQueryUrl(type, id);
	let uri = new Soup.URI(url);
	let request = new Soup.Message({ method: 'GET',
					 uri: uri });

	cancellable.connect((function() {
	    this._session.cancel_message(request, Soup.STATUS_CANCELLED);
	}).bind(this));
	
	this._session.queue_message(request, (function(obj, message) {
	    if (message.status_code !== Soup.KnownStatusCode.OK) {
                callback(false, message.status_code, null);
                return;
            }

            print ('data received: ' + message.response_body.data);

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
            break;
        case 'relation':
            jsonString = Maps.osm_parse_relation(body.data, body.length);
	    break;
        default:
            GLib.error('unknown OSM type: ' + type);
	}

	print ('parsed XML to JSON: ' + jsonString);
	
        if (jsonString !== null)
	    return JSON.parse(jsonString);
        else
            return NULL;
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
    },

    openChangeset: function(comment, source, callback) {
	let changeset = new OSMChangeset.OSMChangeset(comment, source);
	let xml = changeset.toXML();

	print('about open changeset:\n' + xml + '\n');

	let url = this._getOpenChangesetUrl();
	let uri = new Soup.URI(url);
	let msg = new Soup.Message({ method: 'PUT',
					 uri: uri });
	msg.set_request('text/xml', Soup.MemoryUse.COPY, xml, xml.length);
	
	this._session.queue_message(msg, (function(obj, message) {
	    print('got response: ' + message.status_code);
	    if (message.status_code !== Soup.KnownStatusCode.OK) {
                callback(false, message.status_code, null);
                return;
            }

            print ('data received: ' + message.response_body.data);
	    callback(true, message.status_code, message.response_body.data);
	    
        }));
    },

    uploadObject: function(object, changeset, callback) {
	object.changeset = changeset;

	let xml = object.toXML();

	print('about to upload object:\n' + xml + '\n');
    },

    _getOpenChangesetUrl: function() {
	return TEST_BASE_URL + '/' + API_VERSION + '/changeset/create';
    },

    _authenticate: function(session, msg, auth, retrying, user_data) {
	print('authenticating session');
	
	auth.authenticate(this._username, this._password);
    }
})

