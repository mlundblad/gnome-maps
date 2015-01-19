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

#ifndef __MAPSC_OSM_H__
#define __MAPSC_OSM_H__

#include <glib.h>

void maps_osm_init (void);
void maps_osm_finalize (void);

gchar *maps_osm_parse_node (const gchar *content, guint length);
gchar *maps_osm_parse_way (const gchar *content, guint length);
gchar *maps_osm_parse_relation (const gchar *content, guint length);

#endif

