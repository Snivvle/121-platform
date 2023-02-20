import { Injectable } from '@nestjs/common';
import { Issuer, TokenSet } from 'openid-client';
import { CustomHttpService } from '../../../shared/services/custom-http.service';
import { IntersolveCreateCustomerResponseBodyDto } from './dto/intersolve-create-custom-respose.dto';
import { IntersolveCreateCustomerDto } from './dto/intersolve-create-customer.dto';
import { IntersolveIssueTokenResponseDto } from './dto/intersolve-issue-token-response.dto';
import { IntersolveIssueTokenDto } from './dto/intersolve-issue-token.dto';
import { IntersolveLoadResponseDto } from './dto/intersolve-load-response.dto';
import { IntersolveLoadDto } from './dto/intersolve-load.dto';
import { IntersolveVisaApiMockService } from './intersolve-visa-api-mock.services';

const intersolveVisaApiUrl = process.env.INTERSOLVE_VISA_API_URL;

@Injectable()
export class IntersolveVisaApiService {
  public tokenSet: TokenSet;

  public constructor(
    private readonly httpService: CustomHttpService,
    private readonly intersolveVisaApiMockService: IntersolveVisaApiMockService,
  ) {}

  public async getAuthenticationToken(): Promise<string> {
    // Check expires_at
    if (this.tokenSet && this.tokenSet.expires_at > Date.now() - 60000) {
      // Return cached token
      return this.tokenSet.access_token;
    } else {
      // If not valid, request new token
      const trustIssuer = await Issuer.discover(
        `${process.env.INTERSOLVE_VISA_OIDC_ISSUER}/.well-known/openid-configuration`,
      );
      const client = new trustIssuer.Client({
        client_id: process.env.INTERSOLVE_VISA_CLIENT_ID,
        client_secret: process.env.INTERSOLVE_VISA_CLIENT_SECRET,
      });
      const tokenSet = await client.grant({
        grant_type: 'client_credentials',
      });
      // Cache tokenSet
      this.tokenSet = tokenSet;
      return tokenSet.access_token;
    }
  }

  public async createCustomer(
    payload: IntersolveCreateCustomerDto,
  ): Promise<IntersolveCreateCustomerResponseBodyDto> {
    if (process.env.MOCK_INTERSOLVE) {
      return; // TODO: Create mock for this
    } else {
      const authToken = await this.getAuthenticationToken();
      const url = `${intersolveVisaApiUrl}/customer/v1/customers/create-individual`;
      return await this.httpService.post<IntersolveCreateCustomerResponseBodyDto>(
        url,
        payload,
        authToken,
      );
    }
  }

  public async registerHolder(
    payload: {
      holderId: string;
    },
    tokenCode: string,
  ): Promise<any> {
    if (process.env.MOCK_INTERSOLVE) {
      return; // TODO: Create mock for this
    } else {
      const authToken = await this.getAuthenticationToken();
      const url = `${intersolveVisaApiUrl}/wallet/v1/tokens/${tokenCode}/register-holder`;
      // On success this returns a 204 No Content
      return await this.httpService.post<any>(url, payload, authToken);
    }
  }

  public async issueToken(
    payload: IntersolveIssueTokenDto,
  ): Promise<IntersolveIssueTokenResponseDto> {
    if (process.env.MOCK_INTERSOLVE) {
      return this.intersolveVisaApiMockService.issueTokenMock();
    } else {
      const authToken = await this.getAuthenticationToken();
      const brandCode = process.env.INTERSOLVE_VISA_BRAND_CODE;
      const url = `${intersolveVisaApiUrl}/pointofsale/v1/brand-types/${brandCode}/issue-token`;
      console.log('url: ', url);
      return await this.httpService.post<IntersolveIssueTokenResponseDto>(
        url,
        payload,
        authToken,
      );
    }
  }

  public async topUpCard(
    tokenCode: string,
    payload: IntersolveLoadDto,
  ): Promise<IntersolveLoadResponseDto> {
    if (process.env.MOCK_INTERSOLVE) {
      return this.intersolveVisaApiMockService.topUpCardMock(
        payload.quantities[0].quantity.value,
      );
    } else {
      const authToken = await this.getAuthenticationToken();
      const url = `${intersolveVisaApiUrl}/tokens/${tokenCode}/transfers`;
      return await this.httpService.post<IntersolveLoadResponseDto>(
        url,
        payload,
        authToken,
      );
    }
  }
}
