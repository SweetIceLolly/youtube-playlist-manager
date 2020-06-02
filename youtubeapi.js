/**
 * Initalize Google authentication with the given client ID
 * @param {string} clientId - Client id used for authentication
 * @param {function()} onSuccess - The callback function to be called when the operation is successful
 * @param {function()} onFailure - The callback function to be called when the operation is failed
 */
function initAuth(clientId, onSuccess, onFailure) {
  gapi.load("client:auth2", function() {
    gapi.auth2.init({client_id: clientId}).then(
      function() {
        gapi.auth2.getAuthInstance().signIn({scope: "https://www.googleapis.com/auth/youtube.force-ssl"}).then(
          function() {
            gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest").then(
              function() {
                console.log("initAuth(): success");
                onSuccess();
              },
              function(err) {
                console.error("initAuth(): client.load failed", err);
                onFailure(err);
              }
            );
          },
          function(err) {
            console.error("initAuth(): signIn failed");
            onFailure(err);
          }
        );
      },
      function(err) {
        console.error("initAuth(): auth2.init failed", err);
        onFailure(err);
      }
    );
  });
}

/**
 * Get liked videos of the authenticated user with the given page token, up to 50 videos per request
 * @param {string} nextPageToken - nextPageToken property returned by the previous request.
 * Ignore this parameter if this is the first request.
 * @returns The response if the call is successful. The err object otherwise.
 */
async function getLikedVideos(nextPageToken) {
  var filters = {
    "part": "snippet",
    "maxResults": 50,
    "myRating": "like"
  };
  
  // If the parameter is specified, add that information into filters
  if (nextPageToken) {
    filters["pageToken"] = nextPageToken;
  }

  console.log("getLikedVideos(): ", nextPageToken);
  return await gapi.client.youtube.videos.list(filters).then(
    function(response) {
      return response;
    },
    function(err) {
      console.error("getLikedVideos(): client.youtube.videos.list failed", err);
      return err;
    }
  );
}

/**
 * Get playlists of the authenticated user with the given page token, up to 50 videos per request
 * @param {string} nextPageToken - nextPageToken property returned by the previous request.
 * Ignore this parameter if this is the first request.
 * @returns The response if the call is successful. The err object otherwise.
 */
async function getPlaylist(nextPageToken) {
  var filters = {
    "part": "snippet,contentDetails",
    "maxResults": 50,
    "mine": true
  };

  // If the parameter is specified, add that information into filters
  if (nextPageToken) {
    filters["pageToken"] = nextPageToken;
  }

  console.log("getPlaylist(): nextPageToken:", nextPageToken);
  return await gapi.client.youtube.playlists.list(filters).then(
    function(response) {
      return response;
    },
    function(err) {
      console.error("getPlaylist(): client.youtube.playlists.list failed", err);
      return err;
    }
  );
}

/**
 * Get videos of the given playlist (playlistId) with the given page token, up to 50 videos per request
 * @param {string} playlistId - Playlist id
 * @param {string} nextPageToken - nextPageToken property returned by the previous request.
 * Ignore this parameter if this is the first request.
 * @returns The response if the call is successful. The err object otherwise.
 */
async function getPlaylistVideos(playlistId, nextPageToken) {
  var filters = {
    "part": "snippet",
    "maxResults": 50,
    "playlistId": playlistId
  };

  // If the parameter is specified, add that information into filters
  if (nextPageToken) {
    filters["pageToken"] = nextPageToken;
  }

  console.log("getPlaylistVideos(): playlistId:", playlistId, "nextPageToken:", nextPageToken);
  return await gapi.client.youtube.playlistItems.list(filters).then(
    function(response) {
      return response;
    },
    function(err) {
      console.error("getPlaylist(): client.youtube.playlists.list failed", err);
      return err;
    }
  );
}

/**
 * Get number of liked videos of the authenticated user
 * @returns The number of liked videos if the call is successful. The err object otherwise.
 */
async function getLikedVideoCount() {
  var filters = {
    "part": "id",
    "maxResults": 1,
    "myRating": "like"
  };

  console.log("getLikedVideoCount()");
  return await gapi.client.youtube.videos.list(filters).then(
    function(response) {
      return response.result.pageInfo.totalResults;
    },
    function(err) {
      console.error("getLikedVideoCount(): client.youtube.videos.list failed", err);
      return err;
    }
  );
}

/**
 * Create a playlist with the given title and description
 * @param {string} title - Title of the playlist
 * @param {string} desc - Description of the playlist
 * @returns Playlist id if the call is successful. The err object otherwise.
 * Note: The created playlist will be private
 */
async function insertPlaylist(title, desc) {
  var request = {
    "part": "snippet,status",
    "resource": {
      "snippet": {
        "title": title,
        "description": desc
      },
      "status": {
        "privacyStatus": "private"
      }
    }
  };

  console.log("insertPlaylist(): title:", title, "desc:", desc);
  return await gapi.client.youtube.playlists.insert(request).then(
    function(response) {
      console.log("insertPlaylist(): client.youtube.playlists.insert returned:", response);
      return response.result.id;
    },
    function(err) {
      console.error("insertPlaylist(): client.youtube.playlists.insert failed", err);
      return err;
    }
  );
}

/**
 * Add the given video (identified by videoId) into the given playlist (identified by playlistId)
 * @param {string} playlistId - Playlist id
 * @param {string} videoId - Video id
 * @returns The response if the call is successful. The err object otherwise.
 */
async function insertPlaylistItem(playlistId, videoId) {
  var request = {
    "part": "snippet",
    "resource": {
      "snippet": {
        "playlistId": playlistId,
        "resourceId": {
          "kind": "youtube#video",
          "videoId": videoId
        }
      }
    }
  };

  console.log("insertPlaylistItem: playlistId:", playlistId, "videoId:", videoId);
  return await gapi.client.youtube.playlistItems.insert(request).then(
    function(response) {
      console.log("insertPlaylistItem(): client.youtube.playlistItems.insert returned: ", response);
      return response;
    },
    function(err) {
      console.error("insertPlaylistItem(): client.youtube.playlistItems.insert failed", err);
      return err;
    }
  );
}

/**
 * Remove the specified playlist item from its belonging playlist
 * @param {string} playlistItemId Playlist item id
 * @returns The response if the call is successful. The err object otherwise.
 */
async function removePlaylistItem(playlistItemId) {
  var request = {
    "id": playlistItemId
  };

  console.log("removePlaylistItem(): playlistItemId:", playlistItemId)
  return gapi.client.youtube.playlistItems.delete(request).then(
    function(response) {
      console.log("removePlaylistItem(): client.youtube.playlistItems.delete returned: ", response);
      return response;
    },
    function(err) {
      console.error("removePlaylistItem(): client.youtube.playlistItems.delete failed", err);
      return err;
    }
  );
}

/**
 * Get all liked videos of the authenticated user
 * @param {async function(response) => boolean} callback
 * the function to be called for every liked video retrieved.
 * It should return true to keep listing, or false to interrupt operation
 * @return {boolean} true if success, false if interrupted
*/
async function getAllLikedVideos(callback) {
  var nextPageToken;
  var response;

  console.log("getAllLikedVideos()");
  while (true) {
    response = await getLikedVideos(nextPageToken);
    if (!await callback(response)) {
      return false;
    }
    nextPageToken = response.result.nextPageToken;
    if (nextPageToken === undefined) {
      break;
    }
  }
  return true;
}

/**
 * Get all user-owned playlist
 * @param {async function(response) => boolean} callback
 * the function to be called for every playlist retrieved.
 * It should return true to keep listing, or false to interrupt operation
 * @return {boolean} true if success, false if interrupted
 */
async function getAllPlaylist(callback) {
  var nextPageToken;
  var response;

  console.log("getAllPlaylist()");
  while (true) {
    response = await getPlaylist(nextPageToken);
    if (!await callback(response)) {
      return false;
    }
    nextPageToken = response.result.nextPageToken;
    if (nextPageToken === undefined) {
      break;
    }
  }
  return true;
}

/**
 * Get all videos in the specified playlist
 * @param {string} playlistId - Playlist id
 * @param {async function(response) => boolean} callback
 * the function to be called for every liked video retrieved.
 * It should return true to keep listing, or false to interrupt operation
 * @return {boolean} true if success, false if interrupted
*/
async function getAllPlaylistVideos(playlistId, callback) {
  var nextPageToken;
  var response;

  console.log("getAllPlaylistVideos(): playlistId:", playlistId);
  while (true) {
    response = await getPlaylistVideos(playlistId, nextPageToken);
    if (!await callback(response)) {
      return false;
    }
    nextPageToken = response.result.nextPageToken;
    if (nextPageToken === undefined) {
      break;
    }
  }
  return true;
}