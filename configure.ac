# This file is processed by autoconf to create a configure script
AC_INIT([gnome-maps],
        [3.15.4],
        [https://bugzilla.gnome.org/enter_bug.cgi?product=gnome-maps],
        [gnome-maps])

AC_CONFIG_HEADERS([config/config.h])
AC_CONFIG_SRCDIR([src/main.js])
AC_CONFIG_MACRO_DIR([m4])
AC_CONFIG_AUX_DIR([config])
AC_PROG_LN_S

m4_ifdef([AM_SILENT_RULES],[AM_SILENT_RULES([yes])])

AC_CANONICAL_TARGET

AM_INIT_AUTOMAKE([1.10 no-define foreign dist-xz no-dist-gzip])
AM_MAINTAINER_MODE([enable])

GETTEXT_PACKAGE=AC_PACKAGE_NAME
AC_SUBST(GETTEXT_PACKAGE)
AC_DEFINE_UNQUOTED(GETTEXT_PACKAGE,"$GETTEXT_PACKAGE",[The name of the gettext domain])
IT_PROG_INTLTOOL(0.40.0)
PKG_PROG_PKG_CONFIG([0.22])

GIO_MIN_VERSION=2.39.3
GJS_MIN_VERSION=1.43.3
GOBJECT_INTROSPECTION_MIN_VERSION=0.10.1

PKG_CHECK_MODULES(GNOME_MAPS, [
    gio-2.0                      >= $GIO_MIN_VERSION
    gjs-1.0                      >= $GJS_MIN_VERSION
    gobject-introspection-1.0    >= $GOBJECT_INTROSPECTION_MIN_VERSION
])

GLIB_GSETTINGS

AC_PATH_PROG([GJS],[gjs])

GLIB_COMPILE_RESOURCES=`$PKG_CONFIG --variable glib_compile_resources gio-2.0`
AC_SUBST(GLIB_COMPILE_RESOURCES)

AC_CONFIG_FILES([
    Makefile
    src/Makefile
    data/Makefile
    data/icons/Makefile
    po/Makefile.in
])
AC_OUTPUT
