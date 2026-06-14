import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tickers')
export class Ticker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 10 })
  symbol: string;

  @Column()
  name: string;

  @Column()
  exchange: string;

  @Column()
  assetType: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamp' })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
