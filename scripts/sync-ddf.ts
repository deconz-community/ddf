#!/usr/bin/env ts-node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import degit from 'degit'
import fg from 'fast-glob'
import { v4 as uuidv4 } from 'uuid'
import semver from 'semver'
import pkg from 'crypto-js'

const { SHA256 } = pkg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const paths = {
  dictionary: path.resolve(__dirname, '../dictionary.json'),
  output: path.resolve(__dirname, '../devices/'),
  tmp: fs.mkdtempSync('deconz-rest-plugin'),
}

const repo = degit('dresden-elektronik/deconz-rest-plugin')

// Clean up output directories
if (fs.existsSync(paths.output))
  fs.rmSync(paths.output, { recursive: true })

// Download new DDF from GitHub
await repo.clone(paths.tmp)
fs.renameSync(`${paths.tmp}/devices`, paths.output)
fs.rmSync(paths.tmp, { recursive: true })

// Create dictionary if not exists
if (!fs.existsSync(paths.dictionary)) {
  fs.writeFileSync(paths.dictionary, JSON.stringify({
    devices: {},
  }, undefined, 2))
}

// Read dictionary
const dictionary = JSON.parse(fs.readFileSync(paths.dictionary, 'utf8'))

fg.globSync(`${paths.output}/**/*.json`, { ignore: [`${paths.output}/generic/**/*.json`] }).forEach((file) => {
  const data = fs.readFileSync(file, 'utf8')
  const ddf = JSON.parse(data)
  const hash = SHA256(data).toString()

  const relativePath = path.relative(paths.output, file)

  if (dictionary.devices[relativePath] === undefined) {
    dictionary.devices[relativePath] = {
      uuid: uuidv4(),
      version: '1.0.0',
      hash,
    }
  }
  else if (dictionary.devices[relativePath].hash !== hash) {
    dictionary.devices[relativePath].version = semver.inc(dictionary.devices[relativePath].version, 'minor')
    dictionary.devices[relativePath].hash = hash
  }

  ddf.uuid = dictionary.devices[relativePath].uuid
  ddf.version = dictionary.devices[relativePath].version
  ddf.version_deconz = '>2.19.3'

  fs.writeFileSync(file, JSON.stringify(ddf, undefined, 2))
})

fs.writeFileSync(paths.dictionary, JSON.stringify(dictionary, undefined, 2))

// Fix some generic names
fg.globSync(`${paths.output}/generic/subdevices/**/*.json`, {}).forEach((file) => {
  const data = fs.readFileSync(file, 'utf8')
  const subdevices = JSON.parse(data)

  const currentName = path.basename(file)
  const expectedName = `${subdevices.type.replace('$TYPE_', '').toLowerCase()}.json`

  if (currentName !== expectedName) {
    fs.renameSync(file, path.join(path.dirname(file), expectedName))
    console.log(`renamed file subdevices/${currentName} to subdevices/${expectedName}`)
  }
})

fg.globSync(`${paths.output}/generic/items/**/*.json`, {}).forEach((file) => {
  const data = fs.readFileSync(file, 'utf8')
  const item = JSON.parse(data)

  const currentName = path.basename(file)
  const expectedName = `${item.id.replaceAll('\/', '_').toLowerCase()}_item.json`
  if (currentName !== expectedName) {
    fs.renameSync(file, path.join(path.dirname(file), expectedName))
    console.log(`renamed file items/${currentName} to items/${expectedName}`)
  }
})
