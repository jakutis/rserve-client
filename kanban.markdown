# To do

# Doing

# Done

    Goal: investigate:
        I use "rserve-client" connect to the Rserve, then I run :
        rClient.eval 'getwd()', (err, dirName)->
          I got the dirname we are working on.
          Then copy the R file to the directory.
        rClient.eval 'source("'+ rfileName +'")',(err,result)->
          but this line doesn't wokr.
        So here is the question. How can I run a R file in the current directory.
    To do: Tue Feb 18 09:23:55 UTC 2014
    Doing: Tue Feb 18 09:25:43 UTC 2014
    Log:   Tue Feb 18 09:25:48 UTC 2014 - Tue Feb 18 11:36:17 UTC 2014 - the case errors with "type=8 not supported" - needed to fix type=21 - end the tag list when null value encountered
    Done:  Tue Feb 18 11:37:22 UTC 2014
