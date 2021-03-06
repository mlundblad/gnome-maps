/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2011, 2012, 2013 Red Hat, Inc.
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
 * Author: Cosimo Cecchi <cosimoc@redhat.com>
 *         Zeeshan Ali (Khattak) <zeeshanak@gnome.org>
 */

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Application = imports.application;
const ContextMenu = imports.contextMenu;
const FavoritesPopover = imports.favoritesPopover;
const LayersPopover = imports.layersPopover;
const MapView = imports.mapView;
const PlaceEntry = imports.placeEntry;
const PlaceStore = imports.placeStore;
const Sidebar = imports.sidebar;
const Utils = imports.utils;
const ZoomControl = imports.zoomControl;

const _CONFIGURE_ID_TIMEOUT = 100; // msecs
const _WINDOW_MIN_WIDTH = 600;
const _WINDOW_MIN_HEIGHT = 500;

const MainWindow = new Lang.Class({
    Name: 'MainWindow',

    _init: function(app, overlay) {
        this._configureId = 0;
        let ui = Utils.getUIObject('main-window', [ 'app-window',
                                                    'header-bar',
                                                    'grid',
                                                    'main-stack',
                                                    'no-network-view',
                                                    'goto-user-location-button',
                                                    'toggle-sidebar-button',
                                                    'layers-button',
                                                    'favorites-button' ]);
        this.window = ui.appWindow;
        this.window.application = app;
        this._overlay = overlay;

        this.mapView = new MapView.MapView();
        overlay.add(this.mapView);

        this.mapView.gotoUserLocation(false);

        this._sidebar = this._createSidebar();

        this._contextMenu = new ContextMenu.ContextMenu(this.mapView);

        ui.layersButton.popover = new LayersPopover.LayersPopover();
        ui.favoritesButton.popover = new FavoritesPopover.FavoritesPopover({ mapView: this.mapView });
        this._overlay.add_overlay(new ZoomControl.ZoomControl(this.mapView));

        this._mainStack = ui.mainStack;
        this._mainStack.add(this._overlay);
        this._noNetworkView = ui.noNetworkView;
        this._headerBar = ui.headerBar;
        this._gotoUserLocationButton = ui.gotoUserLocationButton;
        this._toggleSidebarButton = ui.toggleSidebarButton;
        this._layersButton = ui.layersButton;
        this._favoritesButton = ui.favoritesButton;

        this._initHeaderbar();
        this._initActions();
        this._initSignals();
        this._restoreWindowGeometry();

        ui.grid.attach(this._sidebar, 1, 0, 1, 1);

        ui.grid.show_all();
    },

    _createPlaceEntry: function() {
        let placeEntry = new PlaceEntry.PlaceEntry({ mapView:       this.mapView,
                                                     visible:       true,
                                                     margin_start:  6,
                                                     margin_end:    6,
                                                     width_request: 500,
                                                     loupe:         true
                                                   });
        placeEntry.connect('notify::place', (function() {
            if (placeEntry.place) {
                this.mapView.showSearchResult(placeEntry.place);
            }
        }).bind(this));

        let popover = placeEntry.popover;
        popover.connect('selected',
                        this.mapView.grab_focus.bind(this.mapView));
        this.mapView.view.connect('button-press-event',
                                  popover.hide.bind(popover));
        return placeEntry;
    },

    _createSidebar: function() {
        let sidebar = new Sidebar.Sidebar(this.mapView);
        Application.routeService.query.connect('notify',
                                               this._setRevealSidebar.bind(this, true));
        sidebar.bind_property('reveal-child',
                              this.mapView, 'routeVisible',
                              GObject.BindingFlags.DEFAULT);
        this.window.application.bind_property('connected',
                                              sidebar, 'visible',
                                              GObject.BindingFlags.DEFAULT);
        return sidebar;
    },

    _initActions: function() {
        Utils.addActions(this.window, {
            'close': {
                onActivate: this.window.close.bind(this.window)
            },
            'about': {
                onActivate: this._onAboutActivate.bind(this)
            },
            'map-type-menu': {
                state: ['b', false],
                onActivate: this._onMapTypeMenuActivate.bind(this)
            },
            'map-type': {
                paramType: 's',
                state: ['s', 'STREET'],
                onActivate: this._onMapTypeActivate.bind(this)
            },
            'goto-user-location': {
                onActivate: this._onGotoUserLocationActivate.bind(this)
            },
            'toggle-sidebar': {
                accels: ['<Primary>D'],
                state: ['b', false],
                onChangeState: this._onToggleSidebarChangeState.bind(this)
            },
            'zoom-in': {
                accels: ['<Primary>plus'],
                onActivate: this.mapView.view.zoom_in.bind(this.mapView.view)
            },
            'zoom-out': {
                accels: ['<Primary>minus'],
                onActivate:  this.mapView.view.zoom_out.bind(this.mapView.view)
            },
            'find': {
                accels: ['<Primary>F'],
                onActivate: this._placeEntry.grab_focus.bind(this._placeEntry)
            }
        });
    },

    _initSignals: function() {
        this.window.connect('delete-event', this._quit.bind(this));
        this.window.connect('configure-event',
                            this._onConfigureEvent.bind(this));
        this.window.connect('window-state-event',
                            this._onWindowStateEvent.bind(this));
        this.mapView.view.connect('button-press-event',
                                  this.mapView.grab_focus.bind(this.mapView));

        this.window.application.connect('notify::connected', (function() {
            if(this.window.application.connected)
                this._mainStack.visible_child = this._overlay;
            else
                this._mainStack.visible_child = this._noNetworkView;
        }).bind(this));
    },

    _initHeaderbar: function() {
        this._placeEntry = this._createPlaceEntry();
        this._headerBar.custom_title = this._placeEntry;
        this._placeEntry.has_focus = true;

        let favoritesPopover = this._favoritesButton.popover;
        this._favoritesButton.sensitive = favoritesPopover.rows > 0;
        favoritesPopover.connect('notify::rows', (function() {
            this._favoritesButton.sensitive = favoritesPopover.rows > 0;
        }).bind(this));

        Application.geoclue.connect('notify::connected', (function() {
            this._gotoUserLocationButton.sensitive = Application.geoclue.connected;
        }).bind(this));

        this.window.application.connect('notify::connected', (function() {
            let app = this.window.application;

            this._gotoUserLocationButton.sensitive = (app.connected &&
                                                      Application.geoclue.connected);
            this._layersButton.sensitive = app.connected;
            this._toggleSidebarButton.sensitive = app.connected;
            this._favoritesButton.sensitive = (app.connected &&
                                               favoritesPopover.rows > 0);
            this._placeEntry.sensitive = app.connected;
        }).bind(this));
    },

    _saveWindowGeometry: function() {
        let window = this.window.get_window();
        let state = window.get_state();

        if (state & Gdk.WindowState.MAXIMIZED)
            return;

        // GLib.Variant.new() can handle arrays just fine
        let size = this.window.get_size();
        Application.settings.set('window-size', size);

        let position = this.window.get_position();
        Application.settings.set('window-position', position);
    },

    _restoreWindowGeometry: function() {
        let size = Application.settings.get('window-size');
        if (size.length === 2) {
            let [width, height] = size;
            this.window.set_default_size(width, height);
        }

        let position = Application.settings.get('window-position');
        if (position.length === 2) {
            let [x, y] = position;

            this.window.move(x, y);
        }

        if (Application.settings.get('window-maximized'))
            this.window.maximize();
    },

    _onConfigureEvent: function(widget, event) {
        if (this._configureId !== 0) {
            Mainloop.source_remove(this._configureId);
            this._configureId = 0;
        }

        this._configureId = Mainloop.timeout_add(_CONFIGURE_ID_TIMEOUT, (function() {
            this._saveWindowGeometry();
            this._configureId = 0;
            return false;
        }).bind(this));
    },

    _onWindowStateEvent: function(widget, event) {
        let window = widget.get_window();
        let state = window.get_state();

        if (state & Gdk.WindowState.FULLSCREEN)
            return;

        let maximized = (state & Gdk.WindowState.MAXIMIZED);
        Application.settings.set('window-maximized', maximized);
    },

    _quit: function() {
        // remove configure event handler if still there
        if (this._configureId !== 0) {
            Mainloop.source_remove(this._configureId);
            this._configureId = 0;
        }

        // always save geometry before quitting
        this._saveWindowGeometry();

        return false;
    },

    _onGotoUserLocationActivate: function() {
        this.mapView.gotoUserLocation(true);
    },

    _onMapTypeMenuActivate: function(action) {
        let state = action.get_state().get_boolean();
        action.set_state(GLib.Variant.new('b', !state));
    },

    _onMapTypeActivate: function(action, value) {
        action.set_state(value);
        let [mapType, len] = value.get_string();
        this.mapView.setMapType(MapView.MapType[mapType]);
    },

    _onToggleSidebarChangeState: function(action, variant) {
        action.set_state(variant);

        let reveal = variant.get_boolean();
        this._sidebar.set_reveal_child(reveal);
    },

    _setRevealSidebar: function(value) {
        let action = this.window.lookup_action('toggle-sidebar');
        action.change_state(GLib.Variant.new_boolean(value));
    },

    _onAboutActivate: function() {
        let aboutDialog = new Gtk.AboutDialog({
            artists: [ 'Jakub Steiner <jimmac@gmail.com>',
                       'Andreas Nilsson <nisses.mail@home.se>' ],
            authors: [ 'Zeeshan Ali (Khattak) <zeeshanak@gnome.org>',
                       'Mattias Bengtsson <mattias.jc.bengtsson@gmail.com>',
                       'Jonas Danielsson <jonas@threetimestwo.org>'],
            translator_credits: _("translator-credits"),
            /* Translators: This is the program name. */
            program_name: _("Maps"),
            comments: _("A map application for GNOME"),
            copyright: 'Copyright ' + String.fromCharCode(0x00A9) +
                       ' 2011' + String.fromCharCode(0x2013) +
                       '2013 Red Hat, Inc.',
            license_type: Gtk.License.GPL_2_0,
            logo_icon_name: 'gnome-maps',
            version: pkg.version,
            website: 'https://live.gnome.org/Apps/Maps',
            wrap_license: true,

            modal: true,
            transient_for: this.window
        });
        aboutDialog.show();
        aboutDialog.connect('response',
                            aboutDialog.destroy.bind(aboutDialog));
    }
});
