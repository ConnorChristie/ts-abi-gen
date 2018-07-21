import { sync as globSync } from 'glob';
import * as Handlebars from 'handlebars';

import { getNamedContent, solTypeToTsType } from './utils';
import { ContextData, ParamKind, ContractsBackend } from './types';

export class Template {
    private template: Handlebars.TemplateDelegate<ContextData>;

    constructor(templateName: string, partials: string, backend: ContractsBackend) {
        this.registerPartials(partials);

        const mainTemplate = getNamedContent(templateName);
        this.template = Handlebars.compile<ContextData>(mainTemplate.content);

        Handlebars.registerHelper('parameterType', solTypeToTsType(ParamKind.Input, backend));
        Handlebars.registerHelper('returnType', solTypeToTsType(ParamKind.Output, backend));
    }

    render(context: ContextData) {
        return this.template(context);
    }

    private registerPartials(partialsGlob: string): void {
        const partialTemplateFileNames = globSync(partialsGlob);

        for (const partialTemplateFileName of partialTemplateFileNames) {
            const namedContent = getNamedContent(partialTemplateFileName);
            Handlebars.registerPartial(namedContent.name, namedContent.content);
        }
    }
}
