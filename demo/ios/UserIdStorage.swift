//
//  JuiceboxSdk.swift
//  JuiceboxDemo
//
//  Created by Nora Trapp on 10/16/23.
//

import Foundation
import CloudKit
import React

@objc(UserIdStorage)
class UserIdStorage: NSObject {
  enum AccountError: Error {
    case notRegistered
    case parentalRestriction
    case noRecord
  }

  let container = CKContainer.default()

  static let userId = "UserId"
  let userIdRecordId = CKRecord.ID(recordName: userId)

  @objc
  func register(
    _ userId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      let record = CKRecord(recordType: Self.userId, recordID: userIdRecordId)
      record.setObject(userId as NSString, forKey: Self.userId)

      do {
        try await checkAccountStatus()
        try await container.privateCloudDatabase.save(record)
        resolve(())
      } catch {
        reject("\((error as NSError).code)", "Failed to save record: \(error)", error)
      }
    }
  }

  @objc
  func recover(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await checkAccountStatus()
        let record = try await container.privateCloudDatabase.record(for: userIdRecordId)
        guard let userId = record.object(forKey: Self.userId) as? String else {
          throw AccountError.noRecord
        }
        resolve(userId)
      } catch {
        reject("\((error as NSError).code)", "Failed to fetch record: \(error)", error)
      }
    }
  }

  func checkAccountStatus() async throws {
    switch try await container.accountStatus() {
    case .couldNotDetermine, .noAccount, .temporarilyUnavailable:
      throw AccountError.notRegistered
    case .available:
      return
    case .restricted:
      throw AccountError.parentalRestriction
    @unknown default:
      throw AccountError.notRegistered
    }
  }
}
