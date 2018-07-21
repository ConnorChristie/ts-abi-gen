import { sync as globSync } from 'glob';
import * as mkdirp from 'mkdirp';

import { Contract } from './abi-parser';
import { Template } from './template';
import { writeOutputFile } from './utils';
import { ContractsBackend } from './types';

const abisGlob = './ResearchColony.json';
const templateGlob = './templates/contract.handlebars';
const partialsGlob = './templates/partials/**/*.handlebars';
const outputPath = './built';
const backend = ContractsBackend.Ethers;

const template = new Template(templateGlob, partialsGlob, backend);
const abiFileNames = globSync(abisGlob);

mkdirp.sync(outputPath);

for (const abiFileName of abiFileNames) {
    const contract = new Contract(abiFileName);
    const rendering = template.render(contract.context);

    writeOutputFile(contract.name, outputPath, rendering);
}
