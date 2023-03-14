import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdateNoteDto {
  @ApiProperty({ example: '910c50be-f131-4b53-b06b-6506a40a2734' })
  @Length(5, 200)
  public readonly referenceId: string;
  @ApiProperty({ example: 'note here' })
  @IsString()
  public readonly note: string;
}

export class NoteDto {
  public note: string;
  public noteUpdated: Date;
}
