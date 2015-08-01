#!/usr/bin/env python
# -*- coding: utf-8 -*- 

import sys
reload(sys)
sys.setdefaultencoding("utf-8")

import soundcloud
from modules import pleer
from modules import bing
import urllib2

import urllib
import json

key = "b3646c5798838b0bfc6e578b9a3eb059"
client = soundcloud.Client(client_id="48a36c8be3c7c53ded928352e8ab10b5")
pleer = pleer.PleerApi("936199", "h66Nybmv103RiOd6UOcg")

bing_activated = bing.BingSearchAPI("kbBj8SXuV0fU0GRWIRe9YXeiPlZJ0idtNP3USLfcgVI")

lastfm_tags = {
	"track": ["name","image","artist"],
	"album": ["name","image","artist"],
	"artist": ["name","image"]
}

soundcloud_support = {
	"tracks": "playback_count",
	"users": "followers_count"
}

def bingImage(query):
	data = bing_activated.search('image',query,{'$format': 'json','$top':1}).json()
	if len(data['d']['results'][0]['Image']) > 0:
		return data['d']['results'][0]['Image'][0]['MediaUrl']
	else:
		return None

def songURL(query):
	print "REQUEST:", query
	params = {"query": query, "result_on_page": 1}
	print "REQUEST:", query
	response = pleer.tracks_search(params=params)
	print "RESPONSE:", response

	try:
		id = response["tracks"].keys()[0]
		key = response["tracks"][id]["id"]
		return 'http://pleer.com/browser-extension/files/' + key + '.mp3'
	except:
		return str(query), "...", str(response)

def jsonRead(url):
    response = urllib.urlopen(url);
    return json.loads(response.read())

def lastfm_data(catagory, data, autocomplete, tags, image_url = ""):
	temp_data = {}

	for tag in tags:
		try:
			if tag == "name":
				if autocomplete:
					temp_data["name"] = data[catagory]
				else:
					temp_data["name"] = data["name"]
			elif tag == "image":
				no_image = False
				try:
					if 'image' in data:
						if type(data['image']) == list and not(data["image"][3]["#text"] == ''):
							temp_data["image"] = data["image"][3]["#text"].replace('&','')
						elif type(data['image'] == str):
							temp_data['image'] = 'http://userserve-ak.last.fm/serve/34s/%s' % (
								data['image'].replace('&','')
							)
					else:
						no_image = True
				except:
					no_image = True

				if no_image:
					if autocomplete:
						name = data[catagory].encode("utf-8").replace('&','')
						temp_data["image"] = bingImage('lastfm ' + name)
					else:
						name = data["name"].encode("utf-8").replace('&','')
						temp_data["image"] = bingImage('lastfm ' + name)
	 		else:
				temp_data[tag] = data[tag]
		except:
			pass
	return temp_data

def search(query, autocomplete = True, sources = {"lastfm":["track", "artist", "album"], "soundcloud":["tracks", "users"]}, page = 1, limit = 10):
	print "DATA:", query, autocomplete, sources, page, limit

	response = {}

	for source in sources:
		response[source] = {}
		for catagory in sources[source]:
			response[source][catagory] = []
	
	if "lastfm" in sources.keys():
		if autocomplete:
			url = "http://www.last.fm/search/autocomplete?q=%s" % (
        		query
        	)
			data = jsonRead(url)["response"]["docs"]

			for item in data:
				try:
					if "track" in item:
						catagory = "track"
					elif "album" in item:
						catagory = "album"
					elif "artist" in item and "artist" in response["lastfm"]:
						catagory = "artist"
					
					response["lastfm"][catagory].append(
						lastfm_data(catagory, item, autocomplete, lastfm_tags[catagory])
					)
				except:
					pass

		else:
			for catagory in sources["lastfm"]:
				url = "http://ws.audioscrobbler.com/2.0/?method=%s.search&format=json&page=%s&limit=%s&api_key=%s&%s=%s" % (
					catagory, 
					str(page),
					str(limit), 
					key,
					catagory,
					query
				)
				data = jsonRead(url)["results"][catagory+"matches"]

				if not data == '\n':
					for item in data[catagory]:
						response["lastfm"][catagory].append(
							lastfm_data(catagory, item, autocomplete, lastfm_tags[catagory])
						)
				else:
					response["lastfm"][catagory] = []

	if "soundcloud" in sources.keys():
		query = query.decode("utf-8", "ignore").encode('ascii','ignore')

		for catagory in sources["soundcloud"]:
			data = client.get("/" + catagory, q = query, limit = limit)

			if autocomplete:
				temp_data = data
				data = []

				min_support = temp_data[0].__dict__["obj"][soundcloud_support[catagory]]*0.3
				for item in temp_data:
					support = item.__dict__["obj"][soundcloud_support[catagory]]
					if support > min_support:
						data.append(item)

				if len(data) > 3:
					data = data[0:3]
			
			for item in data:
				try:
					if catagory == "tracks":
						response["soundcloud"][catagory].append({
				            "title": item.title,
				            "user": item.user["username"],
				            "image": item.artwork_url,
				            "id": item.id
				        })

					if catagory == "users":
						response["soundcloud"][catagory].append({
					        "user": item.username,
					         "id": item.id,
					        "image": item.avatar_url
					    })
				except:
					pass

	#Preferably you can do a alphanumetric search, but all unicode can be brough back though
	#print <insert unicode string>.decode('unicode-escape')
	return response

def getHits():
	hits = []
	url = "http://ws.audioscrobbler.com/2.0/?method=chart.getlovedtracks&api_key=%s&format=json" % (
					key
	)
	for item in jsonRead(url)['tracks']['track']:
		name = item['name']
		name = name.encode("utf-8").replace('&','')

		if 'image' in item:
			image = item['image'][0]['#text'][0:-1] + 'g'
		else:
			image = str(bingImage('lastfm ' + name))

		hit = {
			'name': name.encode('utf8'),
			'image': str(image),
			'artist': item['artist']['name'].encode('utf8')
		}
		
		hits.append(hit)
	return hits
	

if __name__ == "__main__":
	print search("lorde", False, sources = {"lastfm":["track", "artist", "album"]}, page=2, limit=20)

#A few breather lines. Phew, that was a lot of code

#Check me out @ ajnin.me

#:)