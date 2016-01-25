var fs = require( 'fs' );

var csvParse = require( 'csv-parse' );
var combinedStream = require( 'combined-stream' );

var logger = require( 'pelias-logger' ).get( 'openaddresses' );
var CleanupStream = require('./cleanupStream');
var ValidRecordFilterStream = require('./validRecordFilterStream');
var DocumentStream = require('./documentStream');

/**
 * Create a stream of Documents from an OpenAddresses file.
 *
 * @param {string} filePath The path of an OpenAddresses CSV file.
 * @return {stream.Readable} A stream of `Document` objects, one
 *    for every valid record inside the OA file.
 */
function createRecordStream( filePath ){
  /**
   * A stream to convert rows of a CSV to Document objects.
   */
  var stats = {
    badRecordCount: 0
  };

  var intervalId = setInterval( function (){
    logger.verbose( 'Number of bad records: ' + stats.badRecordCount );
  }, 10000 );

  var csvParser = csvParse({
    trim: true,
    skip_empty_lines: true,
    relax: true,
    columns: true
  });

  var validRecordFilterStream = ValidRecordFilterStream.create();
  var cleanupStream = CleanupStream.create();
  var documentStream = DocumentStream.create(stats);

  documentStream._flush = function end( done ){
    clearInterval( intervalId );
    done();
  };

  return fs.createReadStream( filePath )
    .pipe( csvParser )
    .pipe( validRecordFilterStream )
    .pipe( cleanupStream )
    .pipe( documentStream );
}

/*
 * Create a single stream from many CSV files
 */
function createFullRecordStream(files) {
  var recordStream = combinedStream.create();

  files.forEach( function forEach( filePath ){
    recordStream.append( function ( next ){
      logger.info( 'Creating read stream for: ' + filePath );
      next(createRecordStream( filePath ) );
    });
  });

  return recordStream;
}

module.exports = {
  create: createFullRecordStream
};