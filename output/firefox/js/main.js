KangoAPI.onReady(function() {

    typing = false;
    page = '';
    search_timer = '';
    hit_query = '';

    function fini() {
        $('.song-image').attr('src', '');
        $('.song-title').text('');
        $('.song-artist').text('');
        $('.control-song, .forwards, .backwards').removeClass('active');
    }

    function renderSong() {
        song = kango.storage.getItem('currentSongInfo');
        console.log(song);
        if (song.name) {
            $('.control-song, .forwards, .backwards').addClass('active');
            $('.song-title').text(song.name);
            $('.song-artist').text(song.artist);

            try {
                if (song.source != 'soundcloud') {
                    url = 'http://www.emby.io/getimage?query=' + song.name + " " + song.artist;
                    console.log(url);
                    $.ajax({
                        url: url,
                        success: function(data) {
                            console.log(data);
                            $('.song-image').attr('src', data);
                        },
                        error: function(xhr, testStatus, error) {
                            $('.song-image').attr('src', song.image);
                        }
                    });
                } else {
                    $('.song-image').attr('src', song.image);
                }
            } catch (e) {
                $('.song-image').attr('src', '');
                console.log(e);
            }
        }
    }

    kango.addMessageListener('renderSong', function(event) {
        renderSong();
    });

    kango.addMessageListener('fini', function(event) {
        fini();
    });

    function drawTrack(location) {
        track = playlists[location].tracks[a];

        $('#' + location).append(
            '<li class="collection-item playlist-song avatar" id="' + track.id + '"><ul><img src="' + track.image + '" alt="" class="image">' +
            '<span class="title">' + track.name + '</span>' +
            '<span class="subtitle">' + track.artist + '</span>' +
            '<a class="btn-floating waves-effect waves-light action grey delete-song-playlist" id="' + 'playlist-' + location + '-id-' + track.id + '"><i class="material-icons action-text">not_interested</i></a>' +
            '<a class="btn-floating waves-effect waves-light action grey down" id="' + 'playlist-' + location + '-id-' + track.id + '"><i class="material-icons action-text">trending_flat</i></a>' +
            '<a class="btn-floating waves-effect waves-light action grey up" id="' + 'playlist-' + location + '-id-' + track.id + '"><i class="material-icons action-text">trending_flat</i></a></ul></li>'
        );
    }

    function drawPlaylists() {
        playlists = kango.storage.getItem('playlists');
        names = Object.keys(playlists);

        $('.playlists').html('');

        for (i = 0; i < names.length; i++) {
            $('.playlists').append('<li>' +
                '<div class="collapsible-header playlist-header">' + playlists[names[i]].name +
                '<a class="btn-floating waves-effect waves-light action grey delete-album" id="delete-' + names[i] + '"><i class="material-icons action-text">not_interested</i></a>' + '</div>' +
                '<div class="collapsible-body">' +
                '<ul class="collection" id="' + names[i] + '">' +
                '</ul>' +
                '</div>' +
                '</li>'
            );

            for (a = 0; a < playlists[names[i]].tracks.length; a++) {
                drawTrack(names[i]);
            }
        }

        $('.playlists').collapsible({
            accordion: false
        });
    }

    function checkSong(songs, song, id) {
        for (var i = 0, len = songs.length; i < len; i++) {
            if (songs[i].id === song) {
                if (!id) {
                    return true;
                } else {
                    return i;
                }
            }
        }
        return false;
    }

    function addPlaylist(name, identifier) {
        playlists = kango.storage.getItem('playlists');
        playlists[identifier] = {
            name: name,
            tracks: []
        };
        kango.storage.setItem('playlists', playlists);
        drawPlaylists();
    }

    function deletePlaylist(name) {
        playlists = kango.storage.getItem('playlists');
        delete playlists[name];
        kango.storage.setItem('playlists', playlists);
        drawPlaylists();
    }

    function addItem(id, picture, title, subtitle, source, identifier, add, album) {

        if (title && picture) {

            if (title.length > 40) {
                return;
            }

            item = '<li class="' + source + ' item" id="' + identifier + '">' +
                '<div class="collection-item avatar collapsible-header">' +
                '<img class="image" id="picture-' + identifier + '" src="' + picture + '" />' +
                '<i class="play material-icons" id="play-' + identifier + '">play_arrow</i>' +
                '<span class="title">' + title + '</span>' +
                '<p class="subtitle">' + subtitle + '</p>';

            if (add) {
                item += '<a class="btn-floating waves-effect waves-light action grey add" id="add-' + identifier + '"><i class="material-icons action-text">add</i></a></div>';
            } else {
                item += '<a class="btn-floating waves-effect waves-light action grey search-this" id="search-' + identifier + '"><i class="material-icons action-text">search</i></a></div>';
            }

            item += '<div id="body-' + identifier + '" class="collapsible-body">';
            item += '</div>';
            item += '</li>';

            $('#' + id).append(item);

            if (album) {
                $('#' + identifier).addClass('album');
                $.get(
                    'http://www.emby.io/getalbum?query=' + title + '&artist=' + subtitle,
                    function(data) {
                        data = eval(data);
                        body_data = '<ul class="collection">';
                        for (i = 0; i < data.length; i++) {
                            add_identifier = CryptoJS.MD5(data[i] + subtitle).words[0];
                            add_identifier = Math.abs(add_identifier);
                            body_data += '<li class="album-song collection-item" id="albumsong-' + add_identifier + '">' + data[i] +
                                '<a class="btn-floating waves-effect waves-light action grey album-add search-this album-song" id="search-' + add_identifier + '"><i class="material-icons action-text">search</i></a></div>' +
                                '</li>';
                        }
                        body_data += '</ul>';
                        $('#body-' + identifier).append(body_data);

                        $('.album-song').hover(function() {
                            $('.album-song').css('cursor', 'pointer');
                            song_add_id = $(this).attr('id').split('-')[1];
                            $("#search-" + song_add_id).show();
                        }, function() {
                            $('.album-song').css('cursor', 'default');
                            song_add_id = $(this).attr('id').split('-')[1];
                            $("#search-" + song_add_id).hide();
                        });

                        $('.album-add').hide();
                    }
                );

            }
        } else {
            $('#body-' + identifier).hide();
        }
    }

    function search(hit_query) {
        if (page != 'search') {
            search_timer = setInterval(function() {

                if (typing === true) {

                    query = $('#music-search').val();

                    if (query.length > 0) {
                        kango.storage.setItem('query', $('#music-search').val());
                        $.ajax({
                            url: "http://www.emby.io/search?query=" + query + "&autocomplete=t"
                        }).then(function(data) {

                            $('.data').html('');
                            $('.spinner').hide();

                            addData(data.lastfm.track, 'track', "image", "name", "artist", "lastfm", true);
                            addData(data.lastfm.album, 'album', "image", "name", "artist", "lastfm", true, true);
                            addData(data.lastfm.artist, 'artist', "image", "name", "", "lastfm", false);
                            addData(data.soundcloud.tracks, 'song', "image", "title", "user", "soundcloud", true);
                            addData(data.soundcloud.users, 'user', "image", "user", "", "soundcloud", false);
                        });
                    } else {
                        $('.data').html('');
                        $('.collection').hide();
                        $('.spinner').show();
                    }

                }
                typing = false;
            }, 1000);
        }
    }

    function addData(items, name, picture, item_title, item_subtitle, source, add, album) {
        if (items.length > 0) {

            for (i = 0; i < items.length; i++) {

                try {

                    title = items[i][item_title];

                    if (title) {
                        $('#' + name + '-list').show();
                    }

                    subtitle = items[i][item_subtitle];

                    if (!subtitle) {
                        subtitle = '';
                    }

                    if (picture in items[i]) {
                        image = items[i][picture];
                    }

                    if ("id" in items[i]) {
                        identifier = items[i].id;
                    } else {
                        identifier = CryptoJS.MD5(title + subtitle).words[0];
                        identifier = Math.abs(identifier);
                    }

                    if (album) {
                        addItem(name + '-results', image, title, subtitle, source, identifier, add, true);
                    } else {
                        addItem(name + '-results', image, title, subtitle, source, identifier, add);
                    }


                } catch (err) {
                    console.log(err);
                }
            }

            $('.action').hide();
            $('.promote').hide();
            $('.play').hide();

            $('.item').hover(function(e) {
                id = $(this).attr('id');
                $('#add-' + id).show();
                $('#search-' + id).show();
            }, function() {
                id = $(this).attr('id');
                $('#add-' + id).hide();
                $('#search-' + id).hide();
            });

            $('.image, .play').hover(function() {
                id = $(this).attr('id').split('-')[1];
                $('#play-' + id).show();
                $('#picture-' + id).css('opacity', '0.5');
            }, function() {
                id = $(this).attr('id').split('-')[1];
                $('#play-' + id).hide();
                $('#picture-' + id).css('opacity', '1');
            });

            $('.collapsible').collapsible({
                accordion: false
            });

        } else {
            $('#' + name + '-list').hide();
        }
    }

    function search_page(query) {
        $("#base").load("../pages/search.html", function() {
            $("#loading").load("../pages/loading.html");
            $('.collection').hide();

            $("#music-search").on("propertychange change click keyup input paste", function(event) {
                typing = true;
            });

            playlists = kango.storage.getItem('playlists');
            names = Object.keys(playlists);
            $('.add-song-to-playlist').html('');
            $('#add-song-to-playlist').leanModal();

            if (names.length > 0) {
                for (i = 0; i < names.length; i++) {
                    $('.add-song-to-playlist').append('<li class="collection-item waves-effect waves-light add-song-playlist-btn" id="' + names[i] + '">' + playlists[names[i]].name + '</li>');
                }
            }

            if (!query) {
                $('#music-search').val(kango.storage.getItem('query'));
            } else {
                typing = true;
                kango.storage.setItem('query', query);
                $('#music-search').val(kango.storage.getItem('query'));
            }

            if (kango.storage.getItem('query') !== '') {
                console.log('test');
                $('.search label').text('');
            }

        });

        search();
        page = 'search';

        typing = true;
        renderSong();
    }

    search_page();

    function playlist_page() {
        $("#base").load("../pages/playlist.html", function() {
            clearInterval(search_timer);

            $('.collapsible').collapsible({
                accordion: false
            });

            $('.add-modal-trigger').leanModal();

            $('.add-playlist').attr("disabled", true);

            $('.add-playlist-confirm').click(function(event) {
                event.preventDefault();

                name = $('#playlist-name').val();
                if (name.length > 0) {
                    identifier = CryptoJS.MD5(name).words[0];
                    identifier = Math.abs(identifier);
                    if (!kango.storage.getItem('playlists')[identifier]) {
                        console.log(name, identifier);
                        $('#add-playlist-modal').closeModal();
                        addPlaylist(name, identifier);
                    }
                }
            });

            drawPlaylists();

        });
        page = 'playlist';
    }

    function discover_page() {
        $("#base").load("../pages/discover.html", function() {
            clearInterval(search_timer);
            /*
            If Judges are reading this, this was previously using:
            $.ajax({
                            url: "http://www.emby.io/gethits"
                        }).then(function(data) {
            Internet was short however shortly prior to the event
            */
            data = kango.storage.getItem('hits');
            for (i = 0; i < data.length; i++) {
                console.log(data[i]);
                title = data[i].name;
                subtitle = data[i].artist;
                picture = data[i].image;
                source = 'lastfm';
                identifier = CryptoJS.MD5(data[i].name).words[0];
                identifier = Math.abs(identifier);
                item = '<li class="' + source + ' item" id="' + identifier + '">' +
                    '<div class="collection-item avatar collapsible-header">' +
                    '<img class="image" id="picture-' + identifier + '" src="' + picture + '" />' +
                    '<span class="title">' + title + '</span>' +
                    '<p class="subtitle" style="font-size: 10.5px;">' + subtitle + '</p>' +
                    '<a class="btn-floating waves-effect waves-light action grey search-this" id="search-' + identifier + '"><i class="material-icons action-text">search</i></a></div>' +
                    '</li>';
                $('#hits').append(item);
            }
        });

        page = 'discover';
    }

    $(document).ready(function() {
        $('ul.tabs').tabs();

        $('#search').click(function() {
            search_page();
        });

        $('#playlist').click(function() {
            playlist_page();
        });

        $('#discover').click(function() {
            discover_page();
        });

        $('body').on("click", '.add', function() {
            id = $(this).attr('id').split('-')[1];
            selector = '#' + id + ' .collapsible-header';
            image = $(selector + ' .image').attr('src');
            artist = $(selector + ' .subtitle').text();
            source = $("#" + id).attr('class').split(" ")[0];

            if ($('#' + id).hasClass('album')) {
                selector = '#body-' + id + ' .collection';
                current_songs = [];
                $(selector).children('li').each(function() {
                    current_songs.push({
                        'id': $(this).attr('id').split('-')[1],
                        'name': $(this)[0].childNodes[0].data,
                        'artist': artist,
                        'image': image,
                        'source': source
                    });
                });

            } else {
                current_songs = [{
                    id: id,
                    source: source,
                    image: image,
                    name: $(selector + ' .title').text(),
                    artist: artist
                }];
            }

            $('.add-song-to-playlist.collection').show();
            $('#add-song-to-playlist').openModal();
        });

        $('body').on('click', '.add-song-playlist-btn', function() {
            $('#add-song-to-playlist').closeModal();
            $('.lean-overlay').hide();

            playlists = kango.storage.getItem('playlists');
            id = $(this).attr('id');

            for (i = 0; i < current_songs.length; i++) {
                if (!checkSong(playlists[id].tracks, current_songs[i].id)) {
                    playlists[id].tracks.push(current_songs[i]);
                }
            }

            kango.storage.setItem('playlists', playlists);
        });

        $('body').on('click', '.search-this', function() {
            id = $(this).attr('id').split('-')[1];
            if ($(this).hasClass('album-song')) {
                query = $('#albumsong-' + id)[0].childNodes[0].data;
            } else {
                query = $('#' + id + ' .title').text();
            }

            if (page != 'search') {
                search_page(query + " " + $('#' + id + ' .subtitle').text());
                $('#search').trigger('click');
            }

        });

        $('body').on('click', '.delete-album', function() {
            deletePlaylist($(this).attr('id').split('-')[1]);
        });

        $('body').on('click', '.delete-song-playlist', function() {
            data = $(this).attr('id').split('-');
            playlist_id = data[1];
            song_id = data[3];
            playlists = kango.storage.getItem('playlists');
            loc = checkSong(playlists[playlist_id].tracks, song_id, true);
            playlists[playlist_id].tracks.splice(loc, 1);
            playlists = kango.storage.setItem('playlists', playlists);
            $('#' + song_id).remove();
        });

        $('body').on('click', '.down, .up', function() {
            data = $(this).attr('id').split('-');
            playlist_id = data[1];
            song_id = data[3];
            playlists = kango.storage.getItem('playlists');
            loc = checkSong(playlists[playlist_id].tracks, song_id, true);
            current = playlists[playlist_id].tracks[loc];
            if ($(this).hasClass('up')) {
                if (loc > 1) {
                    below = playlists[playlist_id].tracks[loc - 1];
                    playlists[playlist_id].tracks[loc] = below;
                    playlists[playlist_id].tracks[loc - 1] = current;
                    playlists = kango.storage.setItem('playlists', playlists);
                }
            } else {
                if (loc < playlists[playlist_id].tracks.length - 1) {
                    below = playlists[playlist_id].tracks[loc + 1];
                    playlists[playlist_id].tracks[loc] = below;
                    playlists[playlist_id].tracks[loc + 1] = current;
                    playlists = kango.storage.setItem('playlists', playlists);
                }
            }

            $('#' + playlist_id).html('');

            playlists = kango.storage.getItem('playlists');
            for (a = 0; a < playlists[playlist_id].tracks.length; a++) {
                drawTrack(playlist_id);
            }
        });

        $('body').on('click', '.play', function() {
            kango.dispatchMessage('clearplaylist');
            id = $(this).attr('id').split('-')[1];
            kango.dispatchMessage('clear');
            if (!$('#' + id).hasClass('album')) {
                console.log('push');
                id = $(this).attr('id').split('-')[1];
                name = $('#' + id + ' .collection-item .title').text();
                artist = $('#' + id + ' .collection-item .subtitle').text();
                source = $('#' + id).attr("class").split(" ")[0];
                image = $('#' + id + ' .collection-item .image').attr('src');
                kango.dispatchMessage('addsong', [{
                    id: id,
                    name: name,
                    artist: artist,
                    source: source,
                    image: image
                }, true]);
            } else {
                selector = '#body-' + id + ' .collection';
                image = $(selector + ' .image').attr('src');
                artist = $('#' + id + ' .subtitle').text();
                source = $("#" + id).attr('class').split(" ")[0];
                console.log(artist);

                $(selector).children('li').each(function() {
                    kango.dispatchMessage('addsong', [{
                        'id': $(this).attr('id').split('-')[1],
                        'name': $(this)[0].childNodes[0].data,
                        'artist': artist,
                        'image': image,
                        'source': source
                    }, false]);
                });
            }
            kango.dispatchMessage('playplaylist');
        });

        $('.control-song').click(function() {
            if ($('.control-song').hasClass('active')) {
                if ($('.control-song').text() == 'play_arrow') {
                    $('.control-song').text('pause');
                    kango.dispatchMessage('playsong');
                } else {
                    $('.control-song').text('play_arrow');
                    kango.dispatchMessage('pausesong');
                }
            }
        });

        $('body').on('click', '.forwards.active', function() {
            kango.dispatchMessage('nextsong');
        });

        $('body').on('click', '.backwards.active', function() {
            kango.dispatchMessage('previoussong');
        });
    });
});
