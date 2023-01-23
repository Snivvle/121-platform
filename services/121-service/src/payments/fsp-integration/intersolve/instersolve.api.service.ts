import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntersolveGetCardResponse } from './dto/intersolve-get-card-response.dto';
import { IntersolveIssueCardResponse } from './dto/intersolve-issue-card-response.dto';
import { IntersolveResultCode } from './enum/intersolve-result-code.enum';
import { IntersolveSoapElements } from './enum/intersolve-soap.enum';
import { IntersolveMockService } from './instersolve.mock';
import { IntersolveRequestEntity } from './intersolve-request.entity';
import { SoapService } from './soap.service';

@Injectable()
export class IntersolveApiService {
  @InjectRepository(IntersolveRequestEntity)
  private readonly intersolveRequestRepository: Repository<IntersolveRequestEntity>;

  public constructor(
    private readonly soapService: SoapService,
    private intersolveMock: IntersolveMockService,
  ) {}

  public async issueCard(
    amount: number,
    refPos: number,
  ): Promise<IntersolveIssueCardResponse> {
    let payload = await this.soapService.readXmlAsJs(
      IntersolveSoapElements.IssueCard,
    );
    payload = this.soapService.changeSoapBody(
      payload,
      IntersolveSoapElements.IssueCard,
      ['Value'],
      String(amount),
    );
    payload = this.soapService.changeSoapBody(
      payload,
      IntersolveSoapElements.IssueCard,
      ['EAN'],
      process.env.INTERSOLVE_EAN,
    );
    payload = this.soapService.changeSoapBody(
      payload,
      IntersolveSoapElements.IssueCard,
      ['TransactionHeader', 'RefPos'],
      String(refPos),
    );

    const intersolveRequest = new IntersolveRequestEntity();
    intersolveRequest.refPos = refPos;
    intersolveRequest.EAN = process.env.INTERSOLVE_EAN;
    intersolveRequest.value = amount;

    let result = new IntersolveIssueCardResponse();
    try {
      const responseBody = !!process.env.MOCK_INTERSOLVE
        ? await this.intersolveMock.post(payload)
        : await this.soapService.post(payload);
      result = {
        resultCode: responseBody.IssueCardResponse.ResultCode._text,
        resultDescription:
          responseBody.IssueCardResponse.ResultDescription._text,
        cardId: responseBody.IssueCardResponse.CardId?._text,
        pin: responseBody.IssueCardResponse.PIN?._text,
        balance: parseInt(responseBody.IssueCardResponse.CardNewBalance?._text),
        transactionId: responseBody.IssueCardResponse.TransactionId?._text,
      };

      intersolveRequest.resultCodeIssueCard = result.resultCode;
      intersolveRequest.cardId = result.cardId;
      intersolveRequest.PIN = parseInt(result.pin) || null;
      intersolveRequest.balance = result.balance || null;
      intersolveRequest.transactionId = parseInt(result.transactionId) || null;
      intersolveRequest.toCancel = result.resultCode != IntersolveResultCode.Ok;
    } catch (Error) {
      console.log('Error: ', Error);
      intersolveRequest.toCancel = true;
      result.resultDescription = Error;
    }
    await this.intersolveRequestRepository.save(intersolveRequest);
    return result;
  }

  public async getCard(
    cardId: string,
    pin: string,
  ): Promise<IntersolveGetCardResponse> {
    let payload = await this.soapService.readXmlAsJs(
      IntersolveSoapElements.GetCard,
    );
    payload = this.soapService.changeSoapBody(
      payload,
      IntersolveSoapElements.GetCard,
      ['CardId'],
      cardId,
    );
    payload = this.soapService.changeSoapBody(
      payload,
      IntersolveSoapElements.GetCard,
      ['PIN'],
      pin,
    );

    const responseBody = !!process.env.MOCK_INTERSOLVE
      ? await this.intersolveMock.post(payload)
      : await this.soapService.post(payload);
    const result = {
      resultCode: responseBody.GetCardResponse.ResultCode._text,
      resultDescription: responseBody.GetCardResponse.ResultDescription._text,
      status: responseBody.GetCardResponse.Card?.Status?._text,
      balance: parseInt(responseBody.GetCardResponse.Card?.Balance?._text),
      balanceFactor: parseInt(
        responseBody.GetCardResponse.Card?.BalanceFactor?._text,
      ),
    };
    return result;
  }

  public async markAsToCancelByRefPos(refPos: number): Promise<void> {
    const intersolveRequest = await this.intersolveRequestRepository.findOneBy({
      refPos: refPos,
    });
    intersolveRequest.updated = new Date();
    intersolveRequest.isCancelled = false;
    intersolveRequest.toCancel = true;
    await this.intersolveRequestRepository.save(intersolveRequest);
  }

  public async markAsToCancel(
    cardId: string,
    transactionIdString: string,
  ): Promise<void> {
    const transactionId = Number(transactionIdString);
    const intersolveRequest = await this.intersolveRequestRepository.findOneBy({
      cardId: cardId,
      transactionId: transactionId,
    });
    intersolveRequest.updated = new Date();
    intersolveRequest.isCancelled = false;
    intersolveRequest.toCancel = true;
    await this.intersolveRequestRepository.save(intersolveRequest);
  }
}
