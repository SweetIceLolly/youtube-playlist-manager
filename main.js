// Navigation button statuses
var currSelected;       // Current selected navigation button
var currPage;           // Current function page

// Loading states
var isLoadingPlaylist;
var isCloneWorking;
var isCompareWorking;
var isSyncWorking;
var isManageWorking;

// Playlist sync info
var syncPlaylist1, syncPlaylist2;

// Stores sync operations
// op: true: add; false: remove
// id: add: videoId; remove: playlistItemId
// [[op, id], [op, id], ...]
var syncOps;

// Playlist manage info
// {index: [videoId, itemId], ...}
var managePlaylist;

// Playlist manage "clipboard"
// [videoId, ...]
var manageClipboard = [];

/**
 * Switch from `hide` element to `show` element
 * @param hide - The screen to hide
 * @param show - The screen to show
 */
function switchScreen(hide, show) {
  $(hide).fadeOut("fast", function() {
    $(window).scrollTop(0);
    $(show).fadeIn("fast");
  });
}

/**
 * Handle client Id editbox enter key press
 */
function edClientIdKeypress(event) {
  var keycode = event.which || event.keycode;
  if (keycode == 13) {
    switchToMainAfterAuth();
  }
}

/**
 * Handle new plylist name editbox enter key press
 */
function edNewPlaylistNameKeypress(event) {
  var keycode = event.which || event.keycode;
  if (keycode == 13) {
    $("#ed-newplaylistdesc").focus();
  }
}

/**
 * Handle new plylist description editbox enter key press
 */
function edNewPlaylistDescKeypress(event) {
  var keycode = event.which || event.keycode;
  if (keycode == 13) {
    btnCreatePlaylistClick();
  }
}

/**
 * Handle new plylist description editbox enter key press
 */
function edNewPlaylistDescKeypress(event) {
  var keycode = event.which || event.keycode;
  if (keycode == 13) {
    btnCreatePlaylistClick();
  }
}

/**
 * Handle clone playlist link editbox enter key press
 */
function edCloneLinkKeypress(event) {
  var keycode = event.which || event.keycode;
  if (keycode == 13) {
    $("#ed-clonename").focus();
  }
}

/**
 * Handle clone playlist name editbox enter key press
 */
function edCloneNameKeypress(event) {
  var keycode = event.which || event.keycode;
  if (keycode == 13) {
    btnClonePlaylistClick();
  }
}

/**
 * Switch to main screen if authentication was success
 */
function switchToMainAfterAuth() {
  var clientid = $("#ed-clientid");
  var errtext = $("#text-autherror");

  if (clientid.val().trim().length == 0) {
    errtext.html('<span style="color: yellow;">Please input your Client ID!</span>');
    clientid.focus();
    return;
  }

  errtext.html('<img class="loading" src="images/loading.gif"> Authenticating...');
  initAuth(clientid.val(),
    function() {
      errtext.html("Successfully authenticated!");
      switchScreen("#page-clientid", "#main_navbar");
      currSelected = $("#btn-create");
      currPage = "#page-create";
      $("#page-create").fadeIn("fast");
      loadUserPlaylist();
    },
    function(err) {
      if (err.details !== undefined) {
        errtext.html('<span style="color: yellow;">' + err.error + '</span><br>' + err.details);
      } else {
        errtext.html('<span style="color: yellow;">' + err.error + '</span>');
      }
    }
  );
}

/**
 * Handle navigation button "Create"
 */
function btnCreateClick() {
  if (currPage == "#page-create") {
    return;
  }
  currSelected.removeClass("btn-navbar-sel");
  currSelected = $("#btn-create");
  currSelected.addClass("btn-navbar-sel");
  switchScreen(currPage, "#page-create");
  currPage = "#page-create";

  $("#ed-newplaylistname").focus();
}

/**
 * Retrieve user's playlist from YouTube
 * @return {boolean} true: the requesst is successful; false: the request has failed
 */
async function loadUserPlaylist() {
  var container_clone, container_sync_1, container_sync_2, container_manage;
  var errtext_clone, errtext_sync_1, errtext_sync_2, errtext_manage;
  var loadingImg_clone, loadingImg_sync_1, loadingImg_sync_2, loadingImg_manage;
  var currItem = 0, totalItem = -1;
  var tmpHtml;

  if (!isLoadingPlaylist) {
    isLoadingPlaylist = true;

    // Initalize element variables
    container_clone = $("#container-clone");
    container_sync_1 = $("#container-sync-1");
    container_sync_2 = $("#container-sync-2");
    container_manage = $("#container-manage");

    container_clone.css("text-align", "center");
    container_sync_1.css("text-align", "center");
    container_sync_2.css("text-align", "center");
    container_manage.css("text-align", "center");
    
    container_clone.html('<img class="loading-large" src="images/loading.gif">\n' +
      '<div class="instruction status" id="text-cloneloadingerror">Processing...</div>');
    container_sync_1.html('<img class="loading-large" src="images/loading.gif">\n' +
      '<div class="instruction status" id="text-syncloadingerror-1">Processing...</div>');
    container_sync_2.html('<img class="loading-large" src="images/loading.gif">\n' +
      '<div class="instruction status" id="text-syncloadingerror-2">Processing...</div>');
    container_manage.html('<img class="loading-large" src="images/loading.gif">\n' +
      '<div class="instruction status" id="text-manageloadingerror">Processing...</div>');

    errtext_clone = $("#text-cloneloadingerror");
    errtext_sync_1 = $("#text-syncloadingerror-1");
    errtext_sync_2 = $("#text-syncloadingerror-2");
    errtext_manage = $("#text-manageloadingerror");

    loadingImg_clone = $("#container-clone .loading-large");
    loadingImg_sync_1 = $("#container-sync-1 .loading-large");
    loadingImg_sync_2 = $("#container-sync-2 .loading-large");
    loadingImg_manage = $("#container-manage .loading-large");

    /*
    HTML code of each "playlistsel" item:

    <div class="playlistsel">
      <label>
        <img class="thumbnail" src="(thumbnail link)">
        <div>
          <input style="display: none;" onchange="(Function)PlaylistSelected()" type="radio" [checked="checked"] name="(Function)playlist" value="(playlist id)">
          <p>(Playlist title)</p>
          <p>(Count of playlist items) videos</p>
        </div>
      </label>
    </div>
    */

    // Add "Liked videos" item
    var likedVideoCount = await getLikedVideoCount();
    tmpHtml = '<div class="playlistsel playlistsel-selected"><label><img class="thumbnail" src="images/like.png"><div>' +
      '<input style="display: none;" type="radio" checked="checked" value="likedvideos"><p>Liked videos</p><p>' +
      (typeof(likedVideoCount) === "number" ? likedVideoCount + ' videos' : 'Failed getting video count: Error ' + likedVideoCount.status) + '</p></div></label></div>';
    
    /**
     * Update all errtext elements
     * @param {string} content - The text to display
     */
    var funcUpdateErrText = function(content) {
      content = content.replace('<a href="/youtube/v3/getting-started#quota">quota</a>', '<a href="https://console.cloud.google.com/iam-admin/quotas" target="_blank">quota</a>')
      errtext_clone.html(content);
      errtext_sync_1.html(content);
      errtext_sync_2.html(content);
      errtext_manage.html(content);
    };

    var success = await getAllPlaylist(function(response) {
      if (response !== undefined) {
        if (response.status === 200) {
          if (totalItem == -1) {
            totalItem = response.result.pageInfo.totalResults;
          }
          response.result.items.forEach(function(item) {
            tmpHtml += '<div class="playlistsel"><label><img class="thumbnail" src="' + item.snippet.thumbnails.default.url +
              '"><div><input style="display: none;" type="radio" value="' + item.id + '"><p>' + item.snippet.title + '</p><p>' +
              item.snippet.description + '</p><p>' + item.contentDetails.itemCount + ' videos</p></div></label></div>';
            currItem++;
            funcUpdateErrText("Processing: " + currItem + "/" + totalItem);
          });
          return true;
        } else {
          funcUpdateErrText('<span style="color: yellow;">Error ' + response.result.error.code + ': ' + response.result.error.message + '</span><br>');
          return false;
        }
      } else {
        if (response.details !== undefined) {
          funcUpdateErrText('<span style="color: yellow;">' + response.error + '</span><br>' + response.details);
        } else {
          funcUpdateErrText('<span style="color: yellow;">' + response.error + '</span>');
        }
        return false;
      }
    });
    
    // Finished retrieving user's playlist, let's show them
    loadingImg_clone.hide();
    loadingImg_sync_1.hide();
    loadingImg_sync_2.hide();
    loadingImg_manage.hide();

    if (success) {
      container_clone.css("text-align", "left");
      container_sync_1.css("text-align", "left");
      container_sync_2.css("text-align", "left");
      container_manage.css("text-align", "left");

      container_clone.html(tmpHtml);
      container_sync_1.html(tmpHtml);
      container_sync_2.html(tmpHtml);
      container_manage.html(tmpHtml);

      // Do not add "liked videos" in the second playlist list of sync
      $("#container-sync-2 > div.playlistsel")[0].remove();

      // Change "name" and "onchange" property for every radio button
      $('#container-clone input[type="radio"]').each(function() {
        $(this).prop("name", "cloneplaylist");
        $(this).attr("onchange", "clonePlaylistSelected()");
      });
      $('#container-sync-1 input[type="radio"]').each(function() {
        $(this).prop("name", "sync1playlist");
        $(this).attr("onchange", "sync1PlaylistSelected()");
      });
      $('#container-sync-2 input[type="radio"]').each(function() {
        $(this).prop("name", "sync2playlist");
        $(this).attr("onchange", "sync2PlaylistSelected()");
      });
      $('#container-manage input[type="radio"]').each(function() {
        $(this).prop("name", "manageplaylist");
        $(this).attr("onchange", "managePlaylistSelected()");
      });
    }

    isLoadingPlaylist = false;
    return success;
  } else {
    return false;
  }
}

/**
 * Handle navigation button "clone"
 */
function btnCloneClick() {
  if (currPage == "#page-clone") {
    return;
  }
  currSelected.removeClass("btn-navbar-sel");
  currSelected = $("#btn-clone");
  currSelected.addClass("btn-navbar-sel");
  switchScreen(currPage, "#page-clone");
  currPage = "#page-clone";
}

/**
 * Handle navigation button "sync"
 */
function btnSyncClick() {
  if (currPage == "#page-sync") {
    return;
  }
  currSelected.removeClass("btn-navbar-sel");
  currSelected = $("#btn-sync");
  currSelected.addClass("btn-navbar-sel");
  switchScreen(currPage, "#page-sync");
  currPage = "#page-sync";
}

/**
 * Handle navigation button "manage"
 */
function btnManageClick() {
  if (currPage == "#page-manage") {
    return;
  }
  currSelected.removeClass("btn-navbar-sel");
  currSelected = $("#btn-manage");
  currSelected.addClass("btn-navbar-sel");
  switchScreen(currPage, "#page-manage");
  currPage = "#page-manage";
}

/**
 * Handle create playlist button
 */
async function btnCreatePlaylistClick() {
  var name = $("#ed-newplaylistname");
  var desc = $("#ed-newplaylistdesc");
  var errtext = $("#text-createerror");

  if (name.val().trim().length == 0) {
    errtext.html('<span style="color: yellow;">Please input a name!</span>');
    name.focus();
    return;
  }
  
  errtext.html('<img class="loading" src="images/loading.gif"> Processing...');
  var rtn = await insertPlaylist(name.val(), desc.val());
  if (typeof rtn === "string") {
    errtext.html('Playlist created! <a href="https://www.youtube.com/playlist?list=' + rtn + '" target="_blank">Check it out</a>');
  } else {
    rtn.result.error.message = rtn.result.error.message.replace('<a href="/youtube/v3/getting-started#quota">quota</a>', '<a href="https://console.cloud.google.com/iam-admin/quotas" target="_blank">quota</a>')
    errtext.html('<span style="color: yellow;">Error ' + rtn.result.error.code + ': ' + rtn.result.error.message + '</span><br>');
  }
}

/**
 * Handle playlist selected event for clone mode
 */
function clonePlaylistSelected() {
  $("input[name=cloneplaylist]").each(function() {
    $(this).parent().parent().parent().removeClass("playlistsel-selected");
  });
  $("input[name=cloneplaylist]:checked").parent().parent().parent().addClass("playlistsel-selected");
  $("#ed-clonelink").val("");
}

/**
 * Handle the first playlist selected event for sync mode
 */
function sync1PlaylistSelected() {
  $("input[name=sync1playlist]").each(function() {
    $(this).parent().parent().parent().removeClass("playlistsel-selected");
  });
  $("input[name=sync1playlist]:checked").parent().parent().parent().addClass("playlistsel-selected");
  $("#ed-synclink").val("");
}

/**
 * Handle the second playlist selected event for sync mode
 */
function sync2PlaylistSelected() {
  $("input[name=sync2playlist]").each(function() {
    $(this).parent().parent().parent().removeClass("playlistsel-selected");
  });
  $("input[name=sync2playlist]:checked").parent().parent().parent().addClass("playlistsel-selected");
}

/**
 * Handle playlist selected event for manage mode
 */
function managePlaylistSelected() {
  $("input[name=manageplaylist]").each(function() {
    $(this).parent().parent().parent().removeClass("playlistsel-selected");
  });
  $("input[name=manageplaylist]:checked").parent().parent().parent().addClass("playlistsel-selected");
  $("#ed-managelink").val("");
}

/**
 * Handle playlist item selected event for manage mode
 */
function managePlaylistItemSelected(event) {
  if (event.target.checked) {
    event.srcElement.parentElement.parentElement.parentElement.classList.add("playlistsel-selected");
  } else {
    event.srcElement.parentElement.parentElement.parentElement.classList.remove("playlistsel-selected");
  }
  $("#text-manageerror").html("" + $("input[name=manageitems]:checked").length + " item(s) selected");
}

/**
 * Handle clone link editbox change
 */
function edCloneLinkChanged() {
  var target = $("input[name=cloneplaylist]:checked");
  target.parent().parent().parent().removeClass("playlistsel-selected");
  target.prop("checked", false);
}

/**
 * Handle sync link editbox change
 */
function edSyncLinkChanged() {
  var target = $("input[name=sync1playlist]:checked");
  target.parent().parent().parent().removeClass("playlistsel-selected");
  target.prop("checked", false);
}

function edManageLinkChanged() {
  var target = $("input[name=manageplaylist]:checked");
  target.parent().parent().parent().removeClass("playlistsel-selected");
  target.prop("checked", false);
}

/**
 * To display error in the "errtext" element
 * @param {string} errtext the element to display error text
 * @param {object} err error object
 */
function displayErr(errtext, err) {
  errtext = errtext.replace('<a href="/youtube/v3/getting-started#quota">quota</a>', '<a href="https://console.cloud.google.com/iam-admin/quotas" target="_blank">quota</a>')
  if (err.details !== undefined) {
    errtext.html('<span style="color: yellow;">' + err.error + '</span><br>' + err.details);
  } else {
    errtext.html('<span style="color: yellow;">' + err.error + '</span>');
  }
};

function getPlaylistId(sel, link, errtext) {
  var playlist;
  if (link.trim().length == 0) {
    // The user didn't provide a playlist ID / name
    // Check if the user has selected a playlist
    playlist = sel;
    if (playlist.length == 0) {
      errtext.html('<span style="color: yellow;">Please specify a playlist</span>');
      return;
    } else {
      // Get id of user's selected playlist
      playlist = playlist[0].value;
    }
  } else {
    // Determine if the text is url or id
    // Assume the input is a url if "/" character presents
    if (link.indexOf("/") != -1) {
      try {
        link = new window.URL(link);
      }
      catch (err) {
        errtext.html('<span style="color: yellow;">Invalid playlist link!</span>');
        return;
      }
      playlist = link.searchParams.get("list");
      if (playlist === null) {
        errtext.html('<span style="color: yellow;">Invalid playlist link!</span>');
        return;
      }
    } else {
      playlist = link;
    }
  }
  return playlist;
}

/**
 * Handle clone playlist button
 */
async function btnClonePlaylistClick() {
  var name = $("#ed-clonename").val();
  var errtext = $("#text-cloneerror");
  var link = $("#ed-clonelink").val();
  var playlist;

  if (name.trim().length == 0) {
    errtext.html('<span style="color: yellow;">Please give a name to the new playlist!</span>');
    return;
  }

  playlist = getPlaylistId($("input[name=cloneplaylist]:checked"), link, errtext);
  if (playlist === undefined) {
    return;
  }

  if (isCloneWorking) {
    errtext.html('<span style="color: yellow;">Another clone job is going on, please wait until it finishes.</span>');
    return;
  } else {
    isCloneWorking = true;
  }

  errtext.html('<img class="loading" src="images/loading.gif"><label id="clonestatus">Creating playlist...</label>');
  var clonestatus = $("#clonestatus");
  var createdPlaylist = await(insertPlaylist(name, ""));
  if (typeof createdPlaylist === "string") {
    clonestatus.html('Playlist created. Now start copying items...');
  } else {
    errtext.html('<span style="color: yellow;">Error ' + createdPlaylist.result.error.code + ': ' + createdPlaylist.result.error.message + '</span><br>');
    isCloneWorking = false;
    return;
  }

  var currItem = 0, totalItem = -1;
  var success, i;

  /**
   * Handle response according to type
   * @param {boolean} type true: for liked videos; false: for other playlists
   * @param {object} response the response object
   * @return {boolean} true: the request is successful; false: the request has failed
   */
  var funcHandleResponse = async function(type, response) {
    var rtn;

    if (response !== undefined) {
      if (response.status === 200) {
        if (totalItem == -1) {
          totalItem = response.result.pageInfo.totalResults;
        }

        for (i = 0; i < response.result.items.length; i++) {
          if (type) {
            rtn = await insertPlaylistItem(createdPlaylist, response.result.items[i].id);
          } else {
            rtn = await insertPlaylistItem(createdPlaylist, response.result.items[i].snippet.resourceId.videoId);
          }
          if (rtn !== undefined) {
            if (rtn.status === 200) {
              currItem++;
              clonestatus.html("Copying items: " + currItem + "/" + totalItem);
            } else {
              errtext.html('<span style="color: yellow;">Error ' + rtn.result.error.code + ': ' + rtn.result.error.message + '</span><br>');
              return false;
            }
          } else {
            displayErr(errtext, rtn);
            return false;
          }
        }
        return true;
      } else {
        errtext.html('<span style="color: yellow;">Error ' + response.result.error.code + ': ' + response.result.error.message + '</span><br>');
        return false;
      }
    } else {
      displayErr(errtext, response);
      return false;
    }
  };

  if (playlist == "likedvideos") {
    // Use "list liked videos" method for like videos since I don't know how
    // to get playlist id of liked videos (this is a special playlist) :)
    success = await getAllLikedVideos(async function(response) {
      return await funcHandleResponse(true, response);
    });
  } else {
    // Use "list playlist items" method for other playlists
    success = await getAllPlaylistVideos(playlist, async function(response) {
      return await funcHandleResponse(false, response);
    });
  }

  // Finished!
  isCloneWorking = false;
  if (success) {
    errtext.html('Successfully cloned the selected playlist! <a href="https://www.youtube.com/playlist?list=' + createdPlaylist + '" target="_blank">Check it out</a>');
  }
}

/**
 * Handle compare playlist button
 */
async function btnComparePlaylistClick() {
  var link = $("#ed-synclink").val();
  var errtext = $("#text-compareerror");
  var playlist_first, playlist_second;

  playlist_first = getPlaylistId($("input[name=sync1playlist]:checked"), link, errtext);
  if (playlist_first === undefined) {
    return;
  }
  playlist_second = getPlaylistId($("input[name=sync2playlist]:checked"), "", errtext);
  if (playlist_second === undefined) {
    return;
  }

  if (isCompareWorking) {
    errtext.html('<span style="color: yellow;">Another compare job is going on, please wait until it finishes.</span>');
    return;
  } else {
    isCompareWorking = true;
    $("#sync-op").hide();
  }

  errtext.html('<img class="loading" src="images/loading.gif"><label id="comparestatus">Comparing playlist...</label>');
  var compareStatus = $("#comparestatus");
  var dictFirstPlaylist = {};
  var dictSecondPlaylist = {};    // For add: {videoId: title}; For remove: {videoId: [playlistItem, title]}
  var currItem = 0, totalItem = -1;
  var success;

  /**
   * Handle response according to type
   * Add the playlist item into the dictionary
   * @param {boolean} type true: for liked videos; false: for other playlists
   * @param {boolean} first true: loading the first playlist; false: loading the second playlist
   * @param {object} response the response object
   * @return {boolean} true: the request is successful; false: the request has failed
   */
  var funcHandleResponse = function(type, first, response) {
    if (response !== undefined) {
      if (response.status === 200) {
        if (totalItem == -1) {
          totalItem = response.result.pageInfo.totalResults;
        }
        if (type) {
          response.result.items.forEach(function(item) {
            if (first) {
              dictFirstPlaylist[item.id] = item.snippet.title;
            } else {
              // Can't reach here because the second playlist can't be likedvideos
            }
            currItem++;
          });
        } else {
          response.result.items.forEach(function(item) {
            if (first) {
              dictFirstPlaylist[item.snippet.resourceId.videoId] = item.snippet.title;
            } else {
              dictSecondPlaylist[item.snippet.resourceId.videoId] = [item.id, item.snippet.title];
            }
            currItem++;
          });
        }
        compareStatus.html((first ? "First" : "Second") + " playlist: Retrieving items: " + currItem + "/" + totalItem);
        return true;
      } else {
        errtext.html('<span style="color: yellow;">Error ' + response.result.error.code + ': ' + response.result.error.message + '</span><br>');
        return false;
      }
    } else {
      displayErr(errtext, response);
      return false;
    }
  };

  if (playlist_first == "likedvideos") {
    // Use "list liked videos" method for like videos since I don't know how
    // to get playlist id of liked videos (this is a special playlist) :)
    success = await getAllLikedVideos(function(response) {
      return funcHandleResponse(true, true, response);
    });
  } else {
    // Use "list playlist items" method for other playlists
    success = await getAllPlaylistVideos(playlist_first, function(response) {
      return funcHandleResponse(false, true, response);
    });
  }
  if (!success) {
    isCompareWorking = false;
    return;
  }

  currItem = 0;
  totalItem = -1;
  // "likedvideos" is not allowed
  success = await getAllPlaylistVideos(playlist_second, function(response) {
    return funcHandleResponse(false, false, response);
  });
  if (!success) {
    isCompareWorking = false;
    return;
  }

  /*
  HTML code of each "playlistsel" item:

  <div class="playlistsel">
    <label>
      <img class="thumbnail" src="(operation image)">
      <div>
        <p>(Operation): (Playlist title)</p>
        <p>Video ID: (Video ID)</p>
      </div>
    </label>
  </div>
  */

  // Compare two playlists and generate an operation list
  errtext.html("Comparing...");
  var tmpHtml = "", addCount = 0, delCount = 0;
  syncPlaylist1 = playlist_first;
  syncPlaylist2 = playlist_second;
  syncOps = [];
  for (var key in dictFirstPlaylist) {
    if (dictSecondPlaylist[key] === undefined) {
      // The second playlist doesn't have this item. Add it.
      tmpHtml += '<div class="playlistsel"><label><img class="thumbnail" src="images/add.png"><div>' +
        '<p>Add: ' + dictFirstPlaylist[key] + '</p><p>Video ID: ' + key + '</p></div></label></div>';
      syncOps.push([true, key]);
      addCount++;
    }
  }
  for (var key in dictSecondPlaylist) {
    if (dictFirstPlaylist[key] === undefined) {
      // The first playlist doesn't have this item. Remove it.
      tmpHtml += '<div class="playlistsel"><label><img class="thumbnail" src="images/remove.png"><div>' +
        '<p>Remove: ' + dictSecondPlaylist[key][1] + '</p><p>Item ID: ' + dictSecondPlaylist[key][0] + '</p></div></label></div>';
      syncOps.push([false, dictSecondPlaylist[key][0]]);
      delCount++;
    }
  }

  // Two playlists are identical
  if (syncOps.length === 0) {
    errtext.html('<span style="color: yellow;">Two playlists are identical.</span><br>');
    isCompareWorking = false;
    return;
  }

  // Display the operation list
  errtext.html("Compare finished");
  $("#container-sync-op").html(tmpHtml);
  $("#text-syncerror").html("" + addCount + " items will be added; " + delCount + " items will be deleted");
  $("#sync-op").show();
  window.scrollTo({
    top: document.querySelector("#sync-op .instruction").getBoundingClientRect().top + window.pageYOffset -
      document.getElementById("main_navbar").getBoundingClientRect().height + 10,
    behavior: "smooth"
  });
  
  // Finished!
  isCompareWorking = false;
}

/**
 * Handle sync playlist button
 */
async function btnSyncPlaylistClick() {
  if (syncPlaylist2 === "" || isCompareWorking) {
    return;
  }
  if (!confirm("Are you sure want to synchronize? The above operations will be executed and cannot be undone.")) {
    return;
  }

  var errtext = $("#text-syncerror");
  if (isSyncWorking) {
    errtext.html('<span style="color: yellow;">Another synchronize job is going on, please wait until it finishes.</span>');
    return;
  } else {
    isSyncWorking = true;
  }

  errtext.html('<img class="loading" src="images/loading.gif"><label id="syncstatus">Synchronizing playlist...</label>');
  var syncStatus = $("#syncstatus");
  var rtn;

  for (var i = 0; i < syncOps.length; i++) {
    if (syncOps[i][0]) {
      // Add this video
      syncStatus.html("Synchronizing: Adding " + syncOps[i][1] + " (" + (i + 1) + "/" + syncOps.length + ")");
      rtn = await insertPlaylistItem(syncPlaylist2, syncOps[i][1]);
    } else {
      // Remove this video
      syncStatus.html("Synchronizing: Removing " + syncOps[i][1] + " (" + (i + 1) + "/" + syncOps.length + ")");
      rtn = await removePlaylistItem(syncOps[i][1]);
    }
    if (rtn !== undefined) {
      if (rtn.status !== 200 && rtn.status !== 204) {
        errtext.html('<span style="color: yellow;">Error ' + rtn.result.error.code + ': ' + rtn.result.error.message + '</span><br>');
        isSyncWorking = false;
        return;
      }
    } else {
      displayErr(errtext, rtn);
      isSyncWorking = false;
      return;
    }
  }

  // Finished!
  isSyncWorking = false;
  loadUserPlaylist();
  errtext.html("Sync finished!");
}

/**
 * Handle load items button
 */
async function btnLoadItemsClick() {
  var link = $("#ed-managelink").val();
  var playlist;

  playlist = getPlaylistId($("input[name=manageplaylist]:checked"), link, errtext);
  if (playlist === undefined) {
    return;
  }

  var errtext = $("#text-managloadeerror");
  errtext.html("");
  if (isManageWorking) {
    errtext.html('<span style="color: yellow;">Another management job is going on, please wait until it finishes.</span>');
    return;
  } else {
    isManageWorking = true;
  }

  var container = $("#container-manage-items");
  var errtext_item;
  var loadingImg_manageitem;
  var currItem = 0, totalItem = -1;
  var success;
  var tmpHtml = "";
  managePlaylist = {};

  container.css("text-align", "center");
  container.html('<img class="loading-large" src="images/loading.gif">\n' +
    '<div class="instruction status" id="text-manageitemloadingerror">Processing...</div>');
  errtext_item = $("#text-manageitemloadingerror");
  loadingImg_manageitem = $("#container-manage-items .loading-large");
  window.scrollTo({
    top: document.querySelector("#page-manage > div:nth-child(11)").getBoundingClientRect().top + window.pageYOffset -
      document.getElementById("main_navbar").getBoundingClientRect().height + 10,
    behavior: "smooth"
  });

  /*
  HTML code of each "playlistsel" item:

  <div class="playlistsel">
    <label>
      <img class="thumbnail" src="(thumbnail link)">
      <div>
        <input style="display: none;" onchange="ManagePlaylistItemSelected()" type="checkbox" name="manageplaylist" value="(index)">
        <p>(Item title)</p>
      </div>
    </label>
  </div>
  */

  /**
   * Handle response according to type
   * Add the playlist item into the container
   * @param {boolean} type true: for liked videos; false: for other playlists
   * @param {object} response the response object
   * @return {boolean} true: the request is successful; false: the request has failed
   */
  var funcHandleResponse = function(type, response) {
    if (response !== undefined) {
      if (response.status === 200) {
        if (totalItem == -1) {
          totalItem = response.result.pageInfo.totalResults;
        }
        if (type) {
          response.result.items.forEach(function(item) {
            tmpHtml += '<div class="playlistsel"><label><img class="thumbnail" src="' + item.snippet.thumbnails.default.url + '">' +
              '<div><input style="display: none;" onchange="managePlaylistItemSelected(event)" type="checkbox" name="manageitems" ' +
              'value="' + currItem + '"><p>' + item.snippet.title + '</p></div></label></div>';
            managePlaylist[currItem] = [item.id, undefined];
            currItem++;
          });
        } else {
          response.result.items.forEach(function(item) {
            tmpHtml += '<div class="playlistsel"><label><img class="thumbnail" src="' + item.snippet.thumbnails.default.url + '">' +
              '<div><input style="display: none;" onchange="managePlaylistItemSelected(event)" type="checkbox" name="manageitems" ' +
              'value="' + currItem + '"><p>' + item.snippet.title + '</p></div></label></div>';
            managePlaylist[currItem] = [item.snippet.resourceId.videoId, item.id];
            currItem++;
          });
        }
        errtext_item.html("Loading items: " + currItem + "/" + totalItem);
        return true;
      } else {
        errtext_item.html('<span style="color: yellow;">Error ' + response.result.error.code + ': ' + response.result.error.message + '</span><br>');
        return false;
      }
    } else {
      displayErr(errtext_item, response);
      return false;
    }
  };

  if (playlist == "likedvideos") {
    // Use "list liked videos" method for like videos since I don't know how
    // to get playlist id of liked videos (this is a special playlist) :)
    success = await getAllLikedVideos(function(response) {
      return funcHandleResponse(true, response);
    });
  } else {
    // Use "list playlist items" method for other playlists
    success = await getAllPlaylistVideos(playlist, function(response) {
      return funcHandleResponse(false, response);
    });
  }

  // Finished retrieving playlist items, let's show them
  loadingImg_manageitem.hide();
  if (success) {
    container.css("text-align", "left");
    container.html(tmpHtml);
    errtext.html("");
    $("#text-manageerror").html("");
  }
  isManageWorking = false;
  return;
}

/**
 * Handle delete items button
 */
async function btnDeleteItemsClick() {
  var checkedItems = $("input[name=manageitems]:checked");
  var errtext = $("#text-manageerror");

  if (isManageWorking) {
    errtext.html('<span style="color: yellow;">Another management job is going on, please wait until it finishes.</span>');
    return;
  } else {
    isManageWorking = true;
  }
  if (checkedItems.length === 0) {
    errtext.html('<span style="color: yellow;">No playlist item selected</span>');
    isManageWorking = false;
    return;
  }
  if (!confirm("Are you sure want to delete " + checkedItems.length + " items? This cannot be undone.")) {
    isManageWorking = false;
    return;
  }

  errtext.html('<img class="loading" src="images/loading.gif"><label id="deletestatus">Deleting...</label>');
  var deleteStatus = $("#deletestatus");
  var rtn;
  var id;

  for (var i = 0; i < checkedItems.length; i++) {
    id = managePlaylist[parseInt(checkedItems[i].value)][1];
    if (id === undefined) {
      errtext.html('<span style="color: yellow;">Sorry, changing liked videos list not yet supported :(</span>');
      isManageWorking = false;
      return;
    }
    deleteStatus.html("Deleting item: " + id + " (" + (i + 1) + "/" + checkedItems.length + ")");
    rtn = await removePlaylistItem(id);
    if (rtn !== undefined) {
      if (rtn.status !== 200 && rtn.status !== 204) {
        errtext.html('<span style="color: yellow;">Error ' + rtn.result.error.code + ': ' + rtn.result.error.message + '</span><br>');
        isManageWorking = false;
        return;
      }
    } else {
      displayErr(errtext, rtn);
      isManageWorking = false;
      return;
    }
  }

  // Finished!
  errtext.html("Deleted " + checkedItems.length + " items. Please click Load button if the playlist is not updated.");
  isManageWorking = false;
  await btnLoadItemsClick();
  loadUserPlaylist();
}

/**
 * Handle copy items button
 */
async function btnCopyItemsClick() {
  var checkedItems = $("input[name=manageitems]:checked");
  var errtext = $("#text-manageerror");

  if (checkedItems.length === 0) {
    errtext.html('<span style="color: yellow;">No items selected</span>');
  }
  manageClipboard = [];
  checkedItems.each(function() {
    manageClipboard.push(managePlaylist[parseInt(this.value)][0]);
  });
  errtext.html("Copied " + checkedItems.length + " items to the clipboard");
}

/**
 * Handle paste items button
 */
async function btnPasteItemsClick() {
  var errtext = $("#text-manageerror");
  var link = $("#ed-managelink").val();
  var playlist;

  if (isManageWorking) {
    errtext.html('<span style="color: yellow;">Another management job is going on, please wait until it finishes.</span>');
    return;
  } else {
    isManageWorking = true;
  }
  playlist = getPlaylistId($("input[name=manageplaylist]:checked"), link, errtext);
  if (playlist === undefined) {
    isManageWorking = false;
    return;
  }
  if (playlist === "likedvideos") {
    errtext.html('<span style="color: yellow;">Sorry, changing liked videos list not yet supported :(</span>');
    isManageWorking = false;
    return;
  }
  if (manageClipboard.length === 0) {
    errtext.html('<span style="color: yellow;">The clipboard is empty</span>');
    isManageWorking = false;
    return;
  }
  if (!confirm("Are you sure want to add " + manageClipboard.length + " items to the selected playlist? This cannot be undone.")) {
    isManageWorking = false;
    return;
  }

  errtext.html('<img class="loading" src="images/loading.gif"><label id="pasteStatus">Pasting...</label>');
  var pasteStatus = $("#pasteStatus");
  var rtn;

  for (var i = 0; i < manageClipboard.length; i++) {
    pasteStatus.html("Adding video: " + manageClipboard[i] + " (" + (i + 1) + "/" + manageClipboard.length + ")");
    rtn = await insertPlaylistItem(playlist, manageClipboard[i]);
    if (rtn !== undefined) {
      if (rtn.status !== 200) {
        errtext.html('<span style="color: yellow;">Error ' + rtn.result.error.code + ': ' + rtn.result.error.message + '</span><br>');
        return false;
      }
    } else {
      displayErr(errtext, rtn);
      isManageWorking = false;
      return;
    }
  }

  // Finished
  errtext.html("Added " + manageClipboard.length + " items. Please click Load button if the playlist is not updated.");
  isManageWorking = false;
  await btnLoadItemsClick();
  loadUserPlaylist();
}