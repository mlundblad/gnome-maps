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

#include "maps-osm.h"

#include <libxml/parser.h>
#include <libxml/xpath.h>

void maps_osm_init (void)
{
  LIBXML_TEST_VERSION;
}

void maps_osm_finalize (void)
{
  xmlCleanupParser ();
}

static xmlDocPtr _read_xml_doc (const gchar *content, guint length)
{
  xmlDoc *doc;

  doc = xmlReadMemory (content, length, "noname.xml", NULL, 0);

  if (!doc) {
    g_error ("Failed to parse to XML document");
    return NULL;
  }

  return doc;
}

static gchar *_parse_tag (const xmlAttr *attrs)
{
  const xmlAttr *cur_attr;
  gchar *key;
  gchar *value;
  gchar *result;

  key = NULL;
  value = NULL;
  
  for (cur_attr = attrs; cur_attr; cur_attr = cur_attr->next) {
    if (g_str_equal (cur_attr->name, "k")) {
      key = g_strescape (cur_attr->children->content, "");
    } else if (g_str_equal (cur_attr->name, "v")) {
      value = g_strescape (cur_attr->children->content, "");
    } else {
      g_warning ("Unexpected tag property: %s\n", cur_attr->name);
    }
  }

  result = g_strdup_printf ("\"%s\": \"%s\"", key, value);

  if (key)
    g_free (key);

  if (value)
    g_free (value);

  return result;
}

static GHashTable *_parse_attributes (const xmlNode *node)
{
  GHashTable *attributes;
  const xmlAttr *cur_attr;
  
  attributes = g_hash_table_new (g_str_hash, g_str_equal);

  for (cur_attr = node->properties; cur_attr; cur_attr = cur_attr->next) {
    g_hash_table_insert (attributes,
			 (gpointer) cur_attr->name,
			 (gpointer) cur_attr->children->content);
  }

  return attributes;
}

static GList *_parse_tags (const xmlNode *tag_child)
{
  GList *tags;
  const xmlNode *cur_node;
  
  tags = NULL;

  for (cur_node = tag_child; cur_node; cur_node = cur_node->next) {
    /* skip non-element nodes */
    if (cur_node->type != XML_ELEMENT_NODE) {
      continue;
    }

    if (g_str_equal (cur_node->name, "tag")) {
      gchar *tag;

      tag = _parse_tag (cur_node->properties);

      if (tag) {
	tags = g_list_append (tags, tag);
      }
    }
  }
  
  return tags;
}

static GList *_parse_node_refs (const xmlNode *node_ref_child)
{
  GList *node_refs;
  const xmlNode *cur_node;

  node_refs = NULL;

  for (cur_node = node_ref_child; cur_node; cur_node = cur_node->next) {
    /* skip non-element nodes */
    if (cur_node->type != XML_ELEMENT_NODE) {
      continue;
    }

    if (g_str_equal (cur_node->name, "nd")) {
      gchar *ref;
      GHashTable *attributes;

      attributes = _parse_attributes (cur_node);
      ref = g_hash_table_lookup (attributes, "ref");

      if (ref) {
	node_refs = g_list_append (node_refs, ref);
      }

      g_hash_table_destroy (attributes);
    }
  }

  return node_refs;
}

static xmlNode *_get_sub_node (xmlDoc *doc, const gchar *name)
{
  xmlNode *node;
  xmlXPathContext *xpath_ctx;
  xmlXPathObject * xpath_obj;
  gchar *xpath;

  xpath = g_strdup_printf ("/osm/%s", name);
  xpath_ctx = xmlXPathNewContext (doc);
  xpath_obj = xmlXPathEvalExpression (xpath, xpath_ctx);

  if (xpath_obj && xpath_obj->nodesetval && xpath_obj->nodesetval->nodeNr > 0) {
    node = xmlCopyNode (xpath_obj->nodesetval->nodeTab[0], 1);
  } else {
    g_warning ("Couldn't find element %s\n", name);
    node = NULL;
  }

  xmlXPathFreeObject (xpath_obj);
  xmlXPathFreeContext (xpath_ctx);
  g_free (xpath);

  return node;
}

static void _fill_tags (GString *buffer, const GList *tag_list)
{
  const GList *cur_tag;

  g_string_append (buffer, "\t\"tags\": {\n");

  for (cur_tag = tag_list; cur_tag; cur_tag = g_list_next (cur_tag)) {
    g_string_append_printf (buffer, "\t\t%s", cur_tag->data);

    if (g_list_next (cur_tag))
      g_string_append (buffer, ",");

    g_string_append (buffer, "\n");
  }

  g_string_append (buffer, "\t}\n");
}

static void _fill_node_ref_list (GString *buffer, const GList *node_list)
{
  const GList *cur_tag;

  g_string_append (buffer, "\t\"nodeRefs\": [\n");

  for (cur_tag = node_list; cur_tag; cur_tag = g_list_next (cur_tag)) {
    g_string_append_printf (buffer, "\t\t%s", cur_tag->data);

    if (g_list_next (cur_tag))
      g_string_append (buffer, ",");

    g_string_append (buffer, "\n");
  }

  g_string_append (buffer, "\t]\n");

}

/**
 * maps_osm_parse_node:
 * @content: XML data
 * @length: Length of data
 */
gchar *maps_osm_parse_node (const gchar *content, guint length)
{
  xmlDoc *doc;
  xmlNode *node;

  const gchar *id;
  const gchar *changeset;
  const gchar *version;
  const gchar *lat;
  const gchar *lon;

  const xmlAttr *cur_attr;

  GString *buffer;

  GList *tag_list;
  GHashTable *attributes;
  
  doc = _read_xml_doc (content, length);

  if (!doc) {
    return NULL;
  }

  node = _get_sub_node (doc, "node");

  if (!node) {
    xmlFreeDoc (doc);
    return NULL;
  }

  attributes = _parse_attributes (node);
  
  id = g_hash_table_lookup (attributes, "id");
  changeset = g_hash_table_lookup (attributes, "changeset");
  version = g_hash_table_lookup (attributes, "version");
  lat = g_hash_table_lookup (attributes, "lat");
  lon = g_hash_table_lookup (attributes, "lon");
    
  if (!id || !changeset || !version || !lat || !lon) {
    g_error ("Missing required attributes\n");
    xmlFreeDoc (doc);
    xmlFreeNode (node);
    g_hash_table_destroy (attributes);
    return NULL;
  }

  buffer = g_string_new (NULL);

  g_string_append (buffer, "{\n");
  g_string_append_printf (buffer, "\t\"id\": \"%s\",\n", id);
  g_string_append_printf (buffer, "\t\"changeset\": \"%s\",\n", changeset);
  g_string_append_printf (buffer, "\t\"version\": \"%s\",\n", version);
  g_string_append_printf (buffer, "\t\"lat\": \"%s\",\n", lat);
  g_string_append_printf (buffer, "\t\"lon\": \"%s\",\n", lon);

  g_hash_table_destroy (attributes);
  
  tag_list = _parse_tags (node->children);
  _fill_tags (buffer, tag_list);

  g_list_free_full (tag_list, g_free);
  g_string_append (buffer, "}\n");

  xmlFreeDoc (doc);
  xmlFreeNode (node);

  return g_string_free (buffer, FALSE);
}

gchar *maps_osm_parse_way (const gchar *content, guint length)
{
  xmlDoc *doc;
  xmlNode *way;
  GHashTable *attributes;
  GList *tag_list;
  GList *node_refs_list;
  GString *buffer;
  
  const gchar *id;
  const gchar *changeset;
  const gchar *version;
  
  doc = _read_xml_doc (content, length);

  if (!doc) {
    return NULL;
  }

  way = _get_sub_node (doc, "way");

  if (!way) {
    xmlFreeDoc (doc);
    return NULL;
  }

  attributes = _parse_attributes (way);
  
  id = g_hash_table_lookup (attributes, "id");
  changeset = g_hash_table_lookup (attributes, "changeset");
  version = g_hash_table_lookup (attributes, "version");

  if (!id || !changeset || !version) {
    g_error ("Missing required attributes\n");
    xmlFreeDoc (doc);
    xmlFreeNode (way);
    g_hash_table_destroy (attributes);
    return NULL;
  }

  buffer = g_string_new (NULL);

  g_string_append (buffer, "{\n");
  g_string_append_printf (buffer, "\t\"id\": \"%s\",\n", id);
  g_string_append_printf (buffer, "\t\"changeset\": \"%s\",\n", changeset);
  g_string_append_printf (buffer, "\t\"version\": \"%s\",\n", version);

  g_hash_table_destroy (attributes);

  tag_list = _parse_tags (way->children);
  _fill_tags (buffer, tag_list);
  g_list_free_full (tag_list, g_free);

  g_string_append (buffer, "\t,\n");
  
  node_refs_list = _parse_node_refs (way->children);
  _fill_node_ref_list (buffer, node_refs_list);
  g_list_free (node_refs_list);

  g_string_append (buffer, "}\n");

  xmlFreeDoc (doc);
  xmlFreeNode (way);

  return g_string_free (buffer, FALSE);
}


static GList *_parse_members (const xmlNode *member_child)
{
  const xmlNode *cur_node;
  GList *members;

  members = NULL;

  for (cur_node = member_child; cur_node; cur_node = cur_node->next) {
    /* skip non-element nodes */
    if (cur_node->type != XML_ELEMENT_NODE) {
      continue;
    }

    if (g_str_equal (cur_node->name, "member")) {
      GHashTable *attributes;

      attributes = _parse_attributes (cur_node);
      members = g_list_append (members, attributes);
    }
  }
  
  return members;
}

static void _fill_members (GString *buffer, const GList *members)
{
  const GList *cur;

  g_string_append (buffer, "\t\"members\":[\n");
  
  for (cur = members; cur; cur = g_list_next (cur)) {
    GHashTable *attributes = (GHashTable *) cur->data;
    const gchar *type = g_hash_table_lookup (attributes, "type");
    const gchar *role = g_hash_table_lookup (attributes, "role");
    const gchar *ref = g_hash_table_lookup (attributes, "ref");
    
    g_string_append (buffer, "\t\t{");
    if (type)
      g_string_append_printf (buffer, "\"type\": \"%s\", ", type);
    if (role)
      g_string_append_printf (buffer, "\"role\": \"%s\", ", role);
    if (ref)
      g_string_append_printf (buffer, "\"ref\": \"%s\"", ref);

    g_string_append (buffer, "}");
    
    if (g_list_next (cur))
      g_string_append (buffer, ",");
    g_string_append (buffer, "\n");
  }

  g_string_append (buffer, "\t]\n");
}

gchar *maps_osm_parse_relation (const gchar *content, guint length)
{
  xmlDoc *doc;
  xmlNode *relation;
  GHashTable *attributes;
  GList *tag_list;
  GList *member_list;
  GString *buffer;
  
  const gchar *id;
  const gchar *changeset;
  const gchar *version;
  
  doc = _read_xml_doc (content, length);

  if (!doc) {
    return NULL;
  }

  relation = _get_sub_node (doc, "relation");

  if (!relation) {
    xmlFreeDoc (doc);
    return NULL;
  }

  attributes = _parse_attributes (relation);
  id = g_hash_table_lookup (attributes, "id");
  changeset = g_hash_table_lookup (attributes, "changeset");
  version = g_hash_table_lookup (attributes, "version");  
  
  if (!id || !changeset || !version) {
    g_error ("Missing required attributes\n");
    xmlFreeDoc (doc);
    xmlFreeNode (relation);
    g_hash_table_destroy (attributes);
    return NULL;
  }

  buffer = g_string_new (NULL);

  g_string_append (buffer, "{\n");
  g_string_append_printf (buffer, "\t\"id\": \"%s\",\n", id);
  g_string_append_printf (buffer, "\t\"changeset\": \"%s\",\n", changeset);
  g_string_append_printf (buffer, "\t\"version\": \"%s\",\n", version);

  g_hash_table_destroy (attributes);
  
  tag_list = _parse_tags (relation->children);
  _fill_tags (buffer, tag_list);
  g_string_append (buffer, "\t,\n");
  g_list_free_full (tag_list, g_free);

  member_list = _parse_members (relation->children);
  _fill_members (buffer, member_list);
  g_list_free_full (member_list, (GDestroyNotify) g_hash_table_destroy);

  g_string_append (buffer, "}\n");

  xmlFreeDoc (doc);
  xmlFreeNode (relation);

  return g_string_free (buffer, FALSE);  
}
