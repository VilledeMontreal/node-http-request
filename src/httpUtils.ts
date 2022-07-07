import { IOrderBy, OrderByDirection, Timer, utils } from '@villedemontreal/general-utils';
import { Request } from 'express';
import httpHeaderFieldsTyped from 'http-header-fields-typed';
import * as _ from 'lodash';
import * as superagent from 'superagent';
import { configs } from './config/configs';
import { constants } from './config/constants';
import { createLogger } from './utils/logger';

const logger = createLogger('HttpUtils');

/**
 * HTTP utilities
 */
export class HttpUtils {
  private readonly REQ_PARAMS_LOWERCASED = '__queryParamsLowercased';

  /**
   * Remove first and last slash of the string unless the string is the part after protocol (http://)
   */
  public removeSlashes(text: string) {
    if (text) {
      let start;
      let end: number;
      start = 0;
      while (start < text.length && text[start] === '/') {
        start++;
      }
      end = text.length - 1;
      while (end > start && text[end] === '/') {
        end--;
      }

      let result = text.substring(start, end + 1);
      // handle exception of the protocol that's followed with 2 slashes after the semi-colon.
      if (result && result[result.length - 1] === ':') {
        result += '/';
      }
      return result;
    }
    return text;
  }

  /**
   * Join few parts of an url to a final string
   */
  public urlJoin(...args: string[]) {
    return _.map(args, this.removeSlashes)
      .filter(x => !!x)
      .join('/');
  }

  /**
   * Sends a HTTP request built with Superagent.
   *
   * Will add the proper Correlation Id and will write
   * useful logs.
   *
   * IMPORTANT : this method does NOT throw an Error on a
   * 4XX-5XX status response! It will return it the same way
   * it returns a 200 response and it is up to the calling code
   * to validate the actual response's status. For example
   * by using :
   *
   * if(response.ok) {...}
   *
   * and/or by checking the status :
   *
   * if(response.status === 404) {...}
   *
   * An error will be thrown only when a network problem occures or
   * if the target server can't be reached.
   *
   * This is different from SuperAgent's default behavior that DOES
   * throw an error on 4XX-5XX status responses.
   *
   */
  public async send(request: superagent.SuperAgentRequest): Promise<superagent.Response> {
    if (_.isNil(request)) {
      throw new Error(`The request object can't be empty`);
    }

    if ('status' in request) {
      throw new Error(
        `The request object must be of type SuperAgentRequest. Make sure this object has NOT already been awaited ` +
          `prior to being passed here!`
      );
    }

    if (!request.url || request.url.indexOf('://') < 0) {
      throw new Error(`The URL in your request MUST have a protocol and a hostname. Received: ${request.url}`);
    }

    if (utils.isBlank(request.get(httpHeaderFieldsTyped.X_CORRELATION_ID))) {
      const cid = configs.correlationId;
      if (!utils.isBlank(cid)) {
        request.set(httpHeaderFieldsTyped.X_CORRELATION_ID, cid);
      }
    }

    // ==========================================
    // Adds timeouts, if they are not already set.
    // ==========================================
    const responseTimeoutRequestVarName = '_responseTimeout';
    const timeoutRequestVarName = '_timeout';
    request.timeout({
      response:
        request[responseTimeoutRequestVarName] !== undefined
          ? request[responseTimeoutRequestVarName]
          : constants.request.timeoutsDefault.response,
      deadline:
        request[timeoutRequestVarName] !== undefined
          ? request[timeoutRequestVarName]
          : constants.request.timeoutsDefault.deadline
    });

    logger.debug({
      sendingCorrelationIdHeader: request.get(httpHeaderFieldsTyped.X_CORRELATION_ID) || null,
      url: request.url,
      method: request.method,
      msg: `Http Client - Start request to ${request.method} ${request.url}`
    });

    let result;
    const timer = new Timer();
    try {
      result = await request;
    } catch (err) {
      // ==========================================
      // SuperAgent throws a error on 4XX/5XX status responses...
      // But we prefere to return those responses as regular
      // ones and leave it to the caling code to validate
      // the status! That way, we can differenciate between
      // a 4XX/5XX result and a *real* error, for example if
      // the request can't be sent because of a network
      // error....
      // ==========================================
      if (err.status && err.response) {
        result = err.response;
      } else {
        // ==========================================
        // Real error!
        // ==========================================
        logger.debug({
          error: err,
          url: request.url,
          method: request.method,
          timeTaken: timer.toString(),
          msg: `Http Client - End request ERROR request to ${request.method} ${request.url}`
        });

        throw {
          msg: `An error occured while making the HTTP request to ${request.method} ${request.url}`,
          originalError: err
        };
      }
    }

    logger.debug({
      url: request.url,
      method: request.method,
      statusCode: result.status,
      timeTaken: timer.toString(),
      msg: `Http Client - End request to ${request.method} ${request.url}`
    });

    return result;
  }

  /**
   * Gets all the values of a querystring parameter.
   * Manages the fact that we may use insensitive routing.
   *
   * A querystring parameter may indeed contains multiple values. For
   * example : "path?name=aaa&name=bbb" will result in an
   * *array* when getting the "name" parameter : ['aaa', 'bbb'].
   *
   * @returns all the values of the parameters as an array (even if
   * only one value is found) or an empty array if none are found.
   */
  public getQueryParamAll(req: Request, key: string): string[] {
    if (!req || !req.query || !key) {
      return [];
    }

    // ==========================================
    // URL parsing is case sensitive. We can
    // directly return the params as an array here.
    // ==========================================
    if (configs.isUrlCaseSensitive) {
      return this.getOriginalQueryParamAsArray(req, key);
    }

    // ==========================================
    // The URL parsing is case *insensitive* here.
    // We need more work to make sure we merge
    // params in a case insensitive manner.
    // ==========================================
    if (!req[this.REQ_PARAMS_LOWERCASED]) {
      req[this.REQ_PARAMS_LOWERCASED] = [];
      Object.keys(req.query).forEach((keyExisting: string) => {
        const keyLower = keyExisting.toLowerCase();

        if (keyLower in req[this.REQ_PARAMS_LOWERCASED]) {
          req[this.REQ_PARAMS_LOWERCASED][keyLower].push(req.query[keyExisting]);
        } else {
          let val = req.query[keyExisting];
          if (!_.isArray(val)) {
            val = [val] as string[];
          }
          req[this.REQ_PARAMS_LOWERCASED][keyLower] = val;
        }
      });
    }

    const values = req[this.REQ_PARAMS_LOWERCASED][key.toLowerCase()];
    return values || [];
  }

  /**
   * Get the last value of a querystring parameter.
   * Manages the fact that we may use insensitive routing.
   *
   * A querystring parameter may indeed contains multiple values. For
   * example : "path?name=aaa&name=bbb" will result in an
   * *array* when getting the "name" parameter : ['aaa', 'bbb'].
   *
   * In many situation, we only want to deal withy a single value.
   * This function return the last value of a query param.
   *
   * @returns the last parameter with that key or `undefined` if
   *  not found.
   */
  public getQueryParamOne(req: Request, key: string): string {
    const values = this.getQueryParamAll(req, key);
    if (!values || values.length === 0) {
      return undefined;
    }

    return values[values.length - 1];
  }

  /**
   * Get the last value of a querystring parameter *as a Date*.
   * The parameter must be parsable using `new Date(xxx)`.
   * It is recommended to always use ISO-8601 to represent dates
   * (ex: "2020-04-21T17:13:33.107Z").
   *
   * If the parameter is found but can't be parsed to a Date,
   * by default an `Error` is thrown. But if `errorHandler`
   * is specified, it is called instead. This allows you
   * to catch the error and throw a custom error, for
   * example by using `throw createInvalidParameterError(xxx)`
   * in an API.
   *
   * Manages the fact that we may use insensitive routing.
   *
   * @returns the last parameter with that key as a Date
   *  or `undefined` if not found.
   * @throws An Error if the parameter is found but can't be parsed
   *  to a Date and no `errorHandler` is specified.
   */
  public getQueryParamOneAsDate = (
    req: Request,
    key: string,
    errorHandler?: (errMsg: string, value?: string) => any
  ): Date => {
    const dateStr = this.getQueryParamOne(req, key);
    let date: Date;
    if (!utils.isBlank(dateStr)) {
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        const errorMsg = `Not a valid parsable date: "${dateStr}"`;
        if (errorHandler) {
          return errorHandler(errorMsg, dateStr);
        }
        throw new Error(errorMsg);
      }
    }
    return date;
  };

  /**
   * Get the last value of a querystring parameter *as a Number*.
   * The parameter must be parsable using `Number(xxx)`.
   *
   * If the parameter is found but can't be parsed to a Number,
   * by default an `Error` is thrown. But if `errorHandler`
   * is specified, it is called instead. This allows you
   * to catch the error and throw a custom error, for
   * example by using `throw createInvalidParameterError(xxx)`
   * in an API.
   *
   * Manages the fact that we may use insensitive routing.
   *
   * @returns the last parameter with that key as a Number
   *  or `undefined` if not found.
   * @throws An Error if the parameter is found but can't be parsed
   *  to a Number and no `errorHandler` is specified.
   */
  public getQueryParamOneAsNumber = (
    req: Request,
    key: string,
    errorHandler?: (errMsg: string, value?: string) => any
  ): number => {
    const numberStr = this.getQueryParamOne(req, key);
    let val: number;
    if (!utils.isBlank(numberStr)) {
      val = Number(numberStr);
      if (isNaN(val)) {
        const errorMsg = `Not a valid number: "${numberStr}"`;
        if (errorHandler) {
          return errorHandler(errorMsg, numberStr);
        }
        throw new Error(errorMsg);
      }
    }
    return val;
  };

  /**
   * Get the last value of a querystring parameter *as a boolean*.
   * The value must be "true" or "false" (case insensitive) to
   * be considered as a valid boolean. For example, the value '1'
   * is invalid.
   *
   * @returns the last parameter with that key as a boolean
   *  or `undefined` if not found.
   * @throws An Error if the parameter is found but can't be parsed
   *  to a valid boolean and no `errorHandler` is specified.
   */
  public getQueryParamOneAsBoolean = (
    req: Request,
    key: string,
    errorHandler?: (errMsg: string, value?: string) => any
  ): boolean => {
    const boolStr = this.getQueryParamOne(req, key);
    if (utils.isBlank(boolStr)) {
      return undefined;
    }

    if (boolStr.toLowerCase() === 'true') {
      return true;
    }

    if (boolStr.toLowerCase() === 'false') {
      return false;
    }

    const errorMsg = `Not a valid boolean value: "${boolStr}"`;
    if (errorHandler) {
      return errorHandler(errorMsg, boolStr);
    }
    throw new Error(errorMsg);
  };

  private getOriginalQueryParamAsArray(req: Request, key: string) {
    let val = req.query[key];
    if (_.isUndefined(val)) {
      return [];
    }
    if (!_.isArray(val)) {
      val = [val] as string[];
    }
    return val as string[];
  }

  /**
   * Gets the "IOrderBy[]" from the querystring parameters
   * of a search request.
   *
   * @see https://confluence.montreal.ca/pages/viewpage.action?spaceKey=AES&title=REST+API#RESTAPI-Tridelarequ%C3%AAte
   */
  public getOrderBys = (req: Request): IOrderBy[] => {
    const orderBys: IOrderBy[] = [];

    const orderByStr = this.getQueryParamOne(req, 'orderBy');
    if (utils.isBlank(orderByStr)) {
      return orderBys;
    }

    const tokens: string[] = orderByStr.split(',');
    for (let token of tokens) {
      token = token.trim();

      let key = token;
      let direction: OrderByDirection = OrderByDirection.ASC;
      if (token.startsWith('+')) {
        key = token.substring(1);
      } else if (token.startsWith('-')) {
        key = token.substring(1);
        direction = OrderByDirection.DESC;
      }

      const orderBy: IOrderBy = {
        key,
        direction
      };
      orderBys.push(orderBy);
    }

    return orderBys;
  };
}
export let httpUtils: HttpUtils = new HttpUtils();
