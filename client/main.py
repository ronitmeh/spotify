import requests  # calling web service
import jsons  # relational-object mapping



import pathlib
import logging
import sys
import os
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = 'hide'
import base64
import pygame
import time

from configparser import ConfigParser

def prompt():
  """
  Prompts the user and returns the command number

  Parameters
  ----------
  None

  Returns
  -------
  Command number entered by user (0, 1, 2, ...)
  """
  print()
  print(">> Enter a command:")
  print("   0 => end")
  print("   1 => add user")
  print("   2 => add playlist")
  print("   3 => add song to playlist")
  print("   4 => view all playlist information")
  print("   5 => display singular playlist")
  print("   6 => predict genre of playlist")
  print("   7 => preview a playlist")
  print("   8 => what should i listen to?")

  cmd = int(input())
  return cmd

def preview_helper(names, urls):
  """
  Prints out available songs to preview and prompts the user to pick one

  Parameters
  ----------
  None

  Returns
  -------
  Command number entered by user (0, 1, 2, ...)
  """
  count = 1
  print()
  print("Available songs to preview:")
  options = {}
  for i in range(len(names)):
    if urls[i] is not None:
      print("   " + str(count) + ". " + names[i])
      options[count] = i
      count += 1 
  print()
  print("Which song would you like to preview? (Enter Number)")
  

  cmd = int(input())
  return options[cmd], names[options[cmd]]

def download_mp3(url):
   """takes the url and writes it to a file so that it can be played by pygame"""
   response = requests.get(url)
   if response.status_code == 200:
      with open('preview.mp3', 'wb') as f:
         f.write(response.content)

################################################################
def add_user(baseurl):
  """
  Prompts the user for the new user's username,
  last name, and first name, and then inserts
  this user into the database. But if the user's
  email already exists in the database, then we
  update the user's info instead of inserting
  a new user.

  Parameters
  ----------
  baseurl: baseurl for web service

  Returns
  -------
  nothing
  """

  try:

    print("Enter user's Spotify username")
    username = input()
      
    print("Enter user's last (family) name>")
    last_name = input()

    print("Enter user's first (given) name>")
    first_name = input()

    #
    # build the data packet:
    #
    # TODO
    #
    data = {
        "lastname": last_name,
        "firstname": first_name,
        "username": username
    }

    #
    # call the web service:
    #
    api = '/user'
    url = baseurl + api

    #
    # TODO
    #
    res = requests.put(url, json=data)
    #

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # success, extract userid:
    #
    body = res.json()

    userid = body["userid"]
    message = body["message"]

    print("User", userid, "successfully", message)

  except Exception as e:
    logging.error("add_user() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


################################################################
def display_playlist(baseurl):
    '''Displays the ownership and name information for all playlists'''
    try:
        class Playlist:
            playlist_id: int
            playlist_name: str
            first_name: str
            last_name: str
            user_id: int
            username: str
            
        api = '/display_playlists'
        url = baseurl + api
    
        res = requests.get(url)
    
        if res.status_code != 200:
          # failed:
          print("Failed with status code:", res.status_code)
          print("url: " + url)
          if res.status_code == 400:  # we'll have an error message
            body = res.json()
            print("Error message:", body["message"])
          #
          return
    
        #
        # deserialize and extract users:
        #
        body = res.json()
        #
        # let's map each dictionary into a User object:
        #
        playlist = []
        for row in body["data"]:
          user = jsons.load(row, Playlist)
          playlist.append(user)
        #
        # Now we can think OOP:
        #
        for p in playlist:
            print(str(p.playlist_id) + ":", p.playlist_name)
            print(" ", "Owner:", p.first_name, p.last_name)
            print(" ", "Owner ID:", p.user_id)
            print(" ", "Owner Username:", p.username)

    except Exception as e:
        logging.error("display_playlist() failed:")
        logging.error("url: " + url)
        logging.error(e)
        return

################################################################
def add_song_to_playlist(baseurl):
    '''Prompts the user for a playlist, song title, and artist, and then adds that song to the playlist'''
    try:
        api = "/add_song"
        url = baseurl + api

        print("Enter playlist ID>")
        playlist_id = input()

        print("Enter song title>")
        song_title = input()

        print("Enter song artist>")
        artist = input()

        data = {
            "play_id": playlist_id,
            "song_title": song_title,
            "artist": artist,
        }

        res = requests.put(url, json=data)

        if res.status_code != 200:
              # failed:
            print("Failed with status code:", res.status_code)
            print("url: " + url)
            if res.status_code == 400:  # we'll have an error message
                body = res.json()
                print("Error message:", body["message"])
              #
            return

        body = res.json()
        print("Song with ID " + body["song_id"] + " added to playlist " + playlist_id)

    except Exception as e:
        logging.error("add_song_to_playlist() failed:")
        logging.error("url: " + url)
        logging.error(e)
        return

###############################################################
def dsp(baseurl):
    '''Prompts the user for a singular playlist, 
    and then displays the 
    songs in that playlist along with 
    the information about it'''
    try:
        api = "/display_singular_playlist"
        url = baseurl + api

        print("Enter playlist ID>")
        playlist = input()

        data = {
            "play_id": playlist,
        }

        res = requests.get(url, json=data)
        if res.status_code != 200:
              # failed:
            print("Failed with status code:", res.status_code)
            print("url: " + url)
            if res.status_code == 400:  # we'll have an error message
                body = res.json()
                print("Error message:", body["message"])
              #
            return
        
        body = res.json()
        print("\n" + body["data"][0][0]["playlist_name"].title())
        print("""******************************\n""")
        for row in body["data"][1]:
            print(" ", row["song_name"].title(), "by", row["artist_name"].title(), "(" + row["duration_ms"] + ")")
            print()
        print("Songs: " + str(len(body["data"][1])))
        print("Total Length:", str(body["data"][2][0]["sum(duration_ms)"][0]) + "h", str(body["data"][2][0]["sum(duration_ms)"][1]) + "m")
        print("Diversity Index:", body["dI"])

    except Exception as e:
        logging.error("dsp() failed:")
        logging.error("url: " + url)
        logging.error(e)
        return

########################################################################
def preview_playlist(baseurl):
  '''Prompts the user for a playlist_id, and then 
  gets all the songs that can be previewed. 
  Function then lets user pick a song to preview, 
  and play, in that playlist until they respond no'''
  try:
      api = "/preview_playlist"
      url = baseurl + api

      print("Enter playlist ID>")
      playlist = input()

      data = {
          "play_id": playlist,
      }

      res = requests.get(url, json=data)
      if res.status_code != 200:
            # failed:
          print("Failed with status code:", res.status_code)
          print("url: " + url)
          if res.status_code == 400:  # we'll have an error message
              body = res.json()
              print("Error message:", body["message"])
            #
          return

      body = res.json()
      
      while True:
        index, name = preview_helper(body["data"]["names"], body["data"]["urls"])

        download_mp3(body["data"]['urls'][index])
        pygame.mixer.init()
        pygame.mixer.music.load("preview.mp3")
        pygame.mixer.music.play()
        print(f"----------------------------\nPlaying: {name}\n----------------------------")
        time.sleep(15)
        pygame.mixer.music.stop()
        
        
        
        
        
        
        print("Would you like to preview another song? (y/n)")
        if input() == "n":
          break

      

  except Exception as e:
      logging.error("dsp() failed:")
      logging.error("url: " + url)
      logging.error(e)
      return
      
################################################################
def add_playlist(baseurl):
  """
  Prompts the user for the new playlists's user_id to be associated with,
  and playlist name, and then adds it to database

  Parameters
  ----------
  baseurl: baseurl for web service

  Returns
  -------
  nothing
  """

  try:

    print("Enter userid")
    user_id = input()

    print("Enter playlist name>")
    playlist_name = input()

    #
    # build the data packet:
    #
    # TODO
    #
    data = {
        "user_id": user_id,
        "playlist_name": playlist_name
    }

    #
    # call the web service:
    #
    api = '/add_playlist'
    url = baseurl + api

    #
    # TODO
    #
    res = requests.put(url, json=data)
    #

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # success, extract userid:
    #
    body = res.json()

    pid = body["playlist_id"]
    message = body["message"]

    print("Playlist", pid, "successfully", message)

  except Exception as e:
    logging.error("add_playlist() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return
################################################################
def discover(baseurl):
  """
  Prompts the user for the new playlists's user_id to be associated with,
  and playlist name, and then adds it to database

  Parameters
  ----------
  baseurl: baseurl for web service

  Returns
  -------
  nothing
  """

  try:

    print("Enter user_id>")
    user_id = input()

    print("""*****************************************************
What is the situation?
1. Party
2. Chill
3. Study
*****************************************************
Enter>""")
    num = int(input())

    #
    # build the data packet:
    #
    # TODO
    #
    data = {
        "user_id": user_id,
        "choice": num
    }

    #
    # call the web service:
    #
    api = '/discover_daily'
    url = baseurl + api

    #
    # TODO
    #
    res = requests.get(url, json=data)
    #

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # success, extract userid:
    #
    body = res.json()
    print("You should listen to the following songs:")

    for i in range(len(body['songs'])):
       print(str(i+1) + '.', body['songs'][i][0])

  except Exception as e:
    logging.error("add_playlist() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return
################################################################
def predict_genre(baseurl):
  '''Prompts user for playlist, and then gets the genre prediction 
  for that playlist based on a neural network ML algorithm'''
  try:
      api = "/predict_genre"
      url = baseurl + api

      print("Enter playlist ID>")
      playlist = input()

      data = {
          "play_id": playlist,
      }

      print("Running ML Algorithm on Playlist...")
      res = requests.get(url, json=data)
      if res.status_code != 200:
            # failed:
          print("Failed with status code:", res.status_code)
          print("url: " + url)
          if res.status_code == 400:  # we'll have an error message
              body = res.json()
              print("Error message:", body["message"])
            #
          return

      body = res.json()
      print("-------------------------------")
      print("""Based on the acousticness, danceability, loudness, energy, popularity, and instrumentalness of the playlist.\n""")
      print("The genre of this playlist is predicted to be", body["data"])
      print("-------------------------------")
  
  except Exception as e:
    logging.error("add_playlist() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return



##################################################################
print("** Welcome to Ronit Mehta's Spotify Playlist Maker**")
print()

# eliminate traceback so we just get error message:
sys.tracebacklimit = 0

#
# what config file should we use for this session?
#
config_file = 'spotify-final-client.ini'

if not pathlib.Path(config_file).is_file():
  print("**ERROR: config file '", config_file, "' does not exist, exiting")
  sys.exit(0)

#
# setup base URL to web service:
#
configur = ConfigParser()
configur.read(config_file)
baseurl = configur.get('client', 'webservice')

#
# make sure baseurl does not end with /, if so remove:
#
if len(baseurl) < 16:
  print("**ERROR**")
  print("**ERROR: baseurl '", baseurl, "' is not nearly long enough...")
  sys.exit(0)

lastchar = baseurl[len(baseurl) - 1]
if lastchar == "/":
  baseurl = baseurl[:-1]

#
# main processing loop:
#
cmd = prompt()

while cmd != 0:
  #
  if cmd == 1:
    add_user(baseurl)
  elif cmd == 5:
    dsp(baseurl)
  elif cmd == 4:
    display_playlist(baseurl)
  elif cmd == 3:
    add_song_to_playlist(baseurl)
  elif cmd == 2:
    add_playlist(baseurl)
  elif cmd == 6:
    predict_genre(baseurl)
  elif cmd == 7:
    preview_playlist(baseurl)
  elif cmd == 8:
     discover(baseurl)
  else:
    print("** Unknown command, try again...")
  #
  cmd = prompt()

#
# done
#
print()
print('** done **')
