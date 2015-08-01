kango.console.log('Extension initialized');

//http://pleer.com/browser-extension/files/52915287Soj.mp3
//https://api.soundcloud.com/tracks/22415130/stream?client_id=48a36c8be3c7c53ded928352e8ab10b5
kango.storage.setItem('query', '');

var music;

function play() {
    if (kango.storage.getItem('currentSong')) {
        song = soundManager.getSoundById(kango.storage.getItem('currentSong'));
        song.play();
    }
}

function pause() {
    if (kango.storage.getItem('currentSong')) {
        song = soundManager.getSoundById(kango.storage.getItem('currentSong'));
        song.pause();
    }
}

function destroy() {
    if (kango.storage.getItem('currentSong')) {
        song = soundManager.getSoundById(kango.storage.getItem('currentSong'));
        song.destruct();
    }
}

function clear() {
    kango.storage.setItem('songs', []);
    kango.storage.setItem('currentsongindex', 0);
    kango.storage.setItem('currentSong', '');
    kango.storage.setItem('currentSongInfo', {});
    kango.storage.setItem('songs', []);
    destroy();
}

clear();

function checkSong(song) {
    songs = kango.storage.getItem('songs');
    for (var i = 0, len = songs.length; i < len; i++) {
        if (songs[i].id === song) {
            return true;
        }
    }
    return false;
}

function previousSong() {
    destroy();

    current = kango.storage.getItem('currentsongindex');
    if (current > 0) {
        kango.storage.setItem('currentsongindex', kango.storage.getItem('currentsongindex') - 1);
        beginSong(songs[kango.storage.getItem('currentsongindex')]);
    }
}

function nextSong() {
    destroy();

    current = kango.storage.getItem('currentsongindex');
    if (current < kango.storage.getItem('songs').length - 1) {
        kango.storage.setItem('currentsongindex', kango.storage.getItem('currentsongindex') + 1);
        startSong(songs[kango.storage.getItem('currentsongindex')]);
    } else {
        kango.storage.setItem('songs', []);
        kango.dispatchMessage('fini');
    }
}

function startSong(song, callback) {

    url = 'http://pleer.com/browser-extension/files/5515224KUy2.mp3'
    name = song.name;
    artist = song.artist;
    source = song.source;

    if (source == 'lastfm') {
        url = "http://www.emby.io/geturl?query=" + name + " " + song.artist + "&source=" + source;
    } else {
        url = "http://www.emby.io/geturl?query=" + song.id + "&source=" + source;
    }

    console.log(url);

    kango.storage.setItem('currentSongInfo', song);
    kango.dispatchMessage('renderSong', song);

    $.ajax({
        url: url
    }).then(function(data) {
        url = data;

        var music = soundManager.createSound({
            url: url,
            onload: function() {
                callback(this.id);
            },
            onerror: function() {
                nextSong();
            },
            autoLoad: true,
            autoPlay: true,
            onfinish: function() {
                kango.dispatchMessage('fini');
                nextSong();
            }
        });
    });
}

function beginSong(song) {
    startSong(song, function(id) {
        destroy();
        console.log("DATA: ", id);
        kango.storage.setItem('currentSong', id);
        console.log("DATA: ", kango.storage.getItem('currentSong'));
        kango.storage.setItem('currentSong', id);
    });
}

$('document').ready(function() {

    kango.addMessageListener('addsong', function(event) {
        song = event.data[0];
        start = event.data[1];
        songs = kango.storage.getItem('songs');

        if (!checkSong(song.id)) {
            if (start) {
                songs.splice(0, 0, song);
            } else {
                songs.push(song);
            }
        }

        kango.storage.setItem('songs', songs);
    });

    kango.addMessageListener('pausesong', function(event) {
        pause();
    });

    kango.addMessageListener('playsong', function(event) {
        play();
    });

    kango.addMessageListener('nextsong', function(event) {
        nextSong();
    });

    kango.addMessageListener('clear', function(event) {
        clear();
    });

    kango.addMessageListener('previoussong', function(event) {
        previousSong();
    });

    kango.addMessageListener('clearplaylist', function(event) {
        pause();
        songs = kango.storage.getItem('songs');
        songs = [];
        kango.storage.setItem('songs', songs);
    });

    kango.addMessageListener('playplaylist', function(event) {
        soundManager.setup({
            url: 'soundmanager2/swf',
            onready: function() {
                songs = kango.storage.getItem('songs');
                beginSong(songs[kango.storage.getItem('currentsongindex')]);
            }
        });
    });
});
