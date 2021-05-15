/** User input */
const PROJECT_OUT = 'dist';
const FOUNDRY_PATH = "../../instances/dev"

/** Execution */

//import * as gulp from 'gulp';
//import * as del from 'del';
//import * as ts from 'gulp-typescript';
//import * as fs from 'fs';
const gulp = require('gulp');
const del = require('del');
const ts = require('gulp-typescript');
const fs = require('fs');
const project = ts.createProject('tsconfig.json')
const memory = {};

/**
 * @param {string | string[]} cleanGlobs
 * @returns {(callback: () => void) => void}
 */
function clean(cleanGlobs) {
  return function (callback) {
    if (typeof cleanGlobs === 'function') {
      cleanGlobs = cleanGlobs();
    }
    if (!Array.isArray(cleanGlobs)) {
      cleanGlobs = [cleanGlobs];
    }
    let completedTasks = 0;
    for (let cleanGlob of cleanGlobs) {
      if (typeof cleanGlob === 'function') {
        cleanGlob = cleanGlob();
      }
      del(cleanGlob, { force:true }).then(() => {
        completedTasks++;
        if (completedTasks >= cleanGlobs.length) {
          callback();
        }
      });
    }
  }
}

/**
 * @param {{from: string, into: string} | {from: string, into: string}[]} compileGlobs
 * @returns {(callback: () => void) => void}
 */
function compile(compileGlobs) {
  return function (callback) {
    if (typeof compileGlobs === 'function') {
      compileGlobs = compileGlobs();
    }
    if (!Array.isArray(compileGlobs)) {
      compileGlobs = [compileGlobs];
    }
    let completedTasks = 0;
    for (let compileGlob of compileGlobs) {
      if (typeof compileGlob === 'function') {
        compileGlob = compileGlob();
      }
      gulp.src(compileGlob.from).pipe(project()).pipe(gulp.dest(compileGlob.into)).on('end', () => {
        completedTasks++;
        if (completedTasks >= compileGlobs.length) {
          callback();
        }
      });
    }
  }
}

/**
 * @param {{from: string, into: string} | {from: string, into: string}[]} copyGlobs
 * @returns {(callback: () => void) => void}
 */
function copy(copyGlobs) {
  return function (callback) {
    if (typeof copyGlobs === 'function') {
      copyGlobs = copyGlobs();
    }
    if (!Array.isArray(copyGlobs)) {
      copyGlobs = [copyGlobs];
    }
    let completedTasks = 0;
    for (let copyGlob of copyGlobs) {
      if (typeof copyGlob === 'function') {
        copyGlob = copyGlob();
      }
      gulp.src(copyGlob.from).pipe(gulp.dest(copyGlob.into)).on('end', () => {
        completedTasks++;
        if (completedTasks >= copyGlobs.length) {
          callback();
        }
      });
    }
  }
}

/**
 * @param {string} destinationPrefix
 * @returns {{from: string, into: string} | {from: string, into: string}[]}
 */
function getCompileGlobs(destinationPrefix) {
  if (typeof destinationPrefix === 'function') {
    destinationPrefix = destinationPrefix();
  }
  return [
    {from: 'src/scripts/*.ts', into: `${destinationPrefix}/scripts/`}
  ];
}

/**
 * @param {string} destinationPrefix
 * @returns {{from: string, into: string} | {from: string, into: string}[]}
 */
function getCopyGlobs(destinationPrefix) {
  if (typeof destinationPrefix === 'function') {
    destinationPrefix = destinationPrefix();
  }
  return [
    {from: 'README.md', into: `${destinationPrefix}/`},
    {from: 'src/module.json', into: `${destinationPrefix}/`},
    {from: 'src/lang/**', into: `${destinationPrefix}/lang/`},
    {from: 'src/templates/**', into: `${destinationPrefix}/templates/`},
    {from: 'src/styles/**', into: `${destinationPrefix}/styles/`},
    {from: 'src/assets/*', into: `${destinationPrefix}/assets/`}
  ];
}

/**
 * @returns {string}
 */
function getFoundryModuleOutput() {
  if (!FOUNDRY_PATH){
    throw new Error('In order to build directly into foundry, you need to specify where foundry is installed by editing the "gulpfile.js"')
  }

  if (!memory.foundryModuleOutput) {
    const moduleFile = fs.readFileSync('src/module.json');
    const moduleJson = JSON.parse(moduleFile.toString());
    memory.foundryModuleOutput = FOUNDRY_PATH + `/Data/modules/${moduleJson.name}`;
  }

  return memory.foundryModuleOutput;
}

gulp.task('build', gulp.series(
    clean(PROJECT_OUT), 
    gulp.parallel(
      compile(getCompileGlobs(PROJECT_OUT)), 
      copy(getCopyGlobs(PROJECT_OUT))
    )
  )
);

const gulpBuildFoundry = gulp.series(
  clean(() => getFoundryModuleOutput()), 
  gulp.parallel(
    compile(() => getCompileGlobs(getFoundryModuleOutput())), 
    copy(() => getCopyGlobs(getFoundryModuleOutput()))
  )
);
gulp.task('buildFoundry', gulpBuildFoundry);

gulp.task('watchFoundry', gulp.series(
  gulpBuildFoundry,
  function() {
    const watcher = gulp.watch([
      ...getCompileGlobs('').map(entry => entry.from),
      ...getCopyGlobs('').map(entry => entry.from)
    ], {ignoreInitial: true});
  
    // new file
    watcher.on('add', gulpBuildFoundry);
    // update file
    watcher.on('change', gulpBuildFoundry);
    // delete file
    watcher.on('unlink', gulpBuildFoundry);
  }
));