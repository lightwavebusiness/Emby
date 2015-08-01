#!/usr/bin/env python
# -*- coding: utf-8 -*- 

from flask import Flask, request
from flask_restful import Resource, Api, reqparse
import ast
from emby import search, songURL, bingImage, getHits, getAlbum

app = Flask(__name__)
api = Api(app)

parser = reqparse.RequestParser()
parser.add_argument('query', type=str, required=True)
parser.add_argument('autocomplete')
parser.add_argument('sources')
parser.add_argument('page', type=int)
parser.add_argument('limit', type=int)

urlgenerator = reqparse.RequestParser()
urlgenerator.add_argument('id', type=str, required=True)
urlgenerator.add_argument('source', type=str, required=True)

#sources = {"lastfm":["track", "artist", "album"], "soundcloud":["tracks", "users"]}

class Search(Resource):
    def get(self):
    	args = parser.parse_args()

    	args['query'] = args['query'].decode("utf-8", "ignore").encode('ascii','ignore')

    	if args['sources']:
    		args['sources'] = ast.literal_eval(args['sources'])

    	if args['autocomplete']:
    		if args['autocomplete'] == 't':
    		 	args['autocomplete'] = True
    		if args['autocomplete'] == 'f':
    			args['autocomplete'] = False
    		print args['autocomplete']

    	print args

    	if args['query']:
    		if 'autocomplete' in args.keys() and not('autocomplete' == None):
    			if args['sources']:
    				if args['page']:
    					if args['limit']:
    						return search(args['query'], args['autocomplete'], args['sources'], args['page'], args['limit'])
    					else:
    						return search(args['query'], args['autocomplete'], args['sources'], args['page'])
    				else:
    					return search(args['query'], args['autocomplete'], args['sources'])
    			else:
    				return search(args['query'], args['autocomplete'])
    		else:
    			return search(args['query'])

"""class URL(Resource):
    def get(self):
        args = urlgenerator.parse_args()
       
        if args['source'] == 'soundcloud':
            url = 'https://api.soundcloud.com/tracks/' + args['id'] + '/stream?client_id=48a36c8be3c7c53ded928352e8ab10b5'
        elif args['source'] == 'lastfm': 
            url = songURL(args['id'])
            print "DATA SONG:", songURL(args['id'])

        return {'url':url,'id':args['id']}
"""

@app.route('/geturl')
def getURL():
    id = request.args.get('query')
    source = request.args.get('source')
    song = ''
    print "ID", id

    if source == 'soundcloud':
        song = 'https://api.soundcloud.com/tracks/' + id + '/stream?client_id=48a36c8be3c7c53ded928352e8ab10b5'
    elif source == 'lastfm':
        song = songURL(id)

    return song

@app.route('/getalbum')
def getAlbumData():
    album = request.args.get('query')
    artist = request.args.get('artist')
    return getAlbum(album, artist)

@app.route('/getimage')
def getImage():
    query = request.args.get('query')
    return bingImage(query)

@app.route('/gethits')
def hits():
    return str(getHits())

api.add_resource(Search, '/search')
#api.add_resource(URL, '/geturl')

if __name__ == '__main__':
    app.run(debug=True)